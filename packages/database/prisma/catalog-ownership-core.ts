export type CatalogKind = 'account' | 'category' | 'paymentMethod';

export type CatalogReference = {
  catalogId: string;
  userId: string | null | undefined;
  source: string;
  referenceId: string;
};

export type CatalogRow = {
  id: string;
  label: string;
  currentOwnerId?: string | null;
};

export type CatalogOwnershipPlanItem = {
  catalogId: string;
  label: string;
  existingOwnerId: string | null;
  referencedOwners: string[];
  owners: string[];
  primaryOwnerId: string | null;
  cloneOwnerIds: string[];
  unresolved: boolean;
  ownerConflict: boolean;
  requiresReview: boolean;
  referenceCount: number;
  ownerlessReferenceCount: number;
  sources: string[];
};

export type CatalogOwnershipPlan = {
  kind: CatalogKind;
  totalCatalogs: number;
  referencedCatalogs: number;
  singleOwner: number;
  multiOwner: number;
  unresolved: number;
  ownerConflicts: number;
  requiresReview: number;
  items: CatalogOwnershipPlanItem[];
};

function cleanOwner(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map(cleanOwner).filter((value): value is string => Boolean(value)))].sort();
}

/**
 * Planeja o backfill sem alterar dados.
 *
 * Regra canônica:
 * - proprietário já gravado no catálogo é evidência primária e não é descartado;
 * - uma referência pertence ao usuário do domínio que a utiliza;
 * - catálogo usado por um único usuário pode manter o ID atual;
 * - catálogo compartilhado entre usuários deve ser clonado por proprietário;
 * - catálogo sem proprietário nem referência não recebe proprietário por adivinhação;
 * - referência sem userId exige revisão antes de qualquer migração destrutiva;
 * - proprietário gravado incompatível com todas as referências exige revisão manual.
 */
export function planCatalogOwnership(
  kind: CatalogKind,
  catalogs: CatalogRow[],
  references: CatalogReference[],
): CatalogOwnershipPlan {
  const refsByCatalog = new Map<string, CatalogReference[]>();
  for (const reference of references) {
    const list = refsByCatalog.get(reference.catalogId) || [];
    list.push(reference);
    refsByCatalog.set(reference.catalogId, list);
  }

  const items = catalogs.map((catalog) => {
    const refs = refsByCatalog.get(catalog.id) || [];
    const referencedOwners = uniqueSorted(refs.map((reference) => reference.userId));
    const existingOwnerId = cleanOwner(catalog.currentOwnerId);
    const ownerlessReferenceCount = refs.filter((reference) => !cleanOwner(reference.userId)).length;
    const ownerConflict = Boolean(existingOwnerId && referencedOwners.length > 0 && !referencedOwners.includes(existingOwnerId));
    const primaryOwnerId = existingOwnerId || referencedOwners[0] || null;
    const cloneOwnerIds = referencedOwners.filter((ownerId) => ownerId !== primaryOwnerId);
    const owners = uniqueSorted([existingOwnerId, ...referencedOwners]);
    const unresolved = primaryOwnerId === null;
    const requiresReview = unresolved || ownerlessReferenceCount > 0 || ownerConflict;

    return {
      catalogId: catalog.id,
      label: catalog.label,
      existingOwnerId,
      referencedOwners,
      owners,
      primaryOwnerId,
      cloneOwnerIds,
      unresolved,
      ownerConflict,
      requiresReview,
      referenceCount: refs.length,
      ownerlessReferenceCount,
      sources: uniqueSorted(refs.map((reference) => reference.source)),
    } satisfies CatalogOwnershipPlanItem;
  });

  return {
    kind,
    totalCatalogs: items.length,
    referencedCatalogs: items.filter((item) => item.referenceCount > 0).length,
    singleOwner: items.filter((item) => item.owners.length === 1).length,
    multiOwner: items.filter((item) => item.owners.length > 1).length,
    unresolved: items.filter((item) => item.unresolved).length,
    ownerConflicts: items.filter((item) => item.ownerConflict).length,
    requiresReview: items.filter((item) => item.requiresReview).length,
    items,
  };
}

export function assertOwnershipPlanIsDeterministic(plan: CatalogOwnershipPlan) {
  for (const item of plan.items) {
    if (item.owners.length > 0 && !item.primaryOwnerId) throw new Error(`CATALOG_OWNER_MISSING:${plan.kind}:${item.catalogId}`);
    if (item.primaryOwnerId && item.cloneOwnerIds.includes(item.primaryOwnerId)) {
      throw new Error(`CATALOG_PRIMARY_OWNER_DUPLICATED:${plan.kind}:${item.catalogId}`);
    }
    const sorted = [...item.owners].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(item.owners)) {
      throw new Error(`CATALOG_OWNER_ORDER_UNSTABLE:${plan.kind}:${item.catalogId}`);
    }
  }
  return true;
}

export function ownershipPlanSummary(plans: CatalogOwnershipPlan[]) {
  return plans.map((plan) => ({
    kind: plan.kind,
    totalCatalogs: plan.totalCatalogs,
    referencedCatalogs: plan.referencedCatalogs,
    singleOwner: plan.singleOwner,
    multiOwner: plan.multiOwner,
    unresolved: plan.unresolved,
    ownerConflicts: plan.ownerConflicts,
    requiresReview: plan.requiresReview,
    clonesRequired: plan.items.reduce((sum, item) => sum + item.cloneOwnerIds.length, 0),
    ownerlessReferences: plan.items.reduce((sum, item) => sum + item.ownerlessReferenceCount, 0),
  }));
}
