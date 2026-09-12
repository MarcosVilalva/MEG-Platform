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
};

export type CatalogOwnershipPlanItem = {
  catalogId: string;
  label: string;
  owners: string[];
  primaryOwnerId: string | null;
  cloneOwnerIds: string[];
  unresolved: boolean;
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
  requiresReview: number;
  items: CatalogOwnershipPlanItem[];
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))].sort();
}

/**
 * Planeja o backfill sem alterar dados.
 *
 * Regra canônica:
 * - uma referência pertence ao usuário do domínio que a utiliza;
 * - catálogo usado por um usuário pode manter o ID atual;
 * - catálogo compartilhado entre usuários deve ser clonado por proprietário;
 * - catálogo sem referência não recebe proprietário por adivinhação;
 * - qualquer referência sem userId exige revisão antes de uma migração destrutiva.
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
    const owners = uniqueSorted(refs.map((reference) => reference.userId));
    const ownerlessReferenceCount = refs.filter((reference) => !reference.userId?.trim()).length;
    const primaryOwnerId = owners[0] || null;
    return {
      catalogId: catalog.id,
      label: catalog.label,
      owners,
      primaryOwnerId,
      cloneOwnerIds: owners.slice(1),
      unresolved: owners.length === 0,
      requiresReview: owners.length === 0 || ownerlessReferenceCount > 0,
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
    requiresReview: plan.requiresReview,
    clonesRequired: plan.items.reduce((sum, item) => sum + item.cloneOwnerIds.length, 0),
    ownerlessReferences: plan.items.reduce((sum, item) => sum + item.ownerlessReferenceCount, 0),
  }));
}
