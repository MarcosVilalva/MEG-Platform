import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { config } from '../../config';

const PRIMARY_WORKSPACE_SLUG = 'marcos-financas';
const EMPTY_STATE = { transactions: [], budgets: {} } as Prisma.InputJsonValue;

function slugify(value: string) {
  const base = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || 'meu-meg';
}

async function availableSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;
  return slug;
}

export async function createWorkspaceForOwner(userId: string, name: string) {
  const existing = await prisma.workspace.findUnique({ where: { ownerId: userId } });
  if (existing) return existing;
  return prisma.workspace.create({
    data: {
      name: name.trim(),
      slug: await availableSlug(name),
      ownerId: userId,
      members: { create: { userId, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
      appState: { create: { userId, state: EMPTY_STATE, revision: 1 } }
    }
  });
}

/** Vincula a base original de Marcos sem copiar, regravar ou recalcular dados. */
export async function ensurePrimaryWorkspace() {
  const adminEmail = config.adminEmail.trim().toLowerCase();
  const owner = await prisma.user.findUnique({ where: { email: adminEmail } })
    ?? await prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: 'asc' } });
  if (!owner) return null;

  let workspace = await prisma.workspace.findUnique({ where: { ownerId: owner.id } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Finanças de Marcos', slug: PRIMARY_WORKSPACE_SLUG, ownerId: owner.id }
    }).catch(async (error) => {
      const bySlug = await prisma.workspace.findUnique({ where: { slug: PRIMARY_WORKSPACE_SLUG } });
      if (bySlug) return bySlug;
      throw error;
    });

  }

  // Executado em todas as inicializações para recuperar com segurança migrações parciais.
  const legacyUsers = await prisma.user.findMany({ where: { workspaceMemberships: { none: {} } }, select: { id: true, role: true, status: true, isActive: true } });
  if (legacyUsers.length) {
    await prisma.workspaceMember.createMany({
      data: legacyUsers.map((user) => ({ workspaceId: workspace.id, userId: user.id, role: user.role, status: user.status, isActive: user.isActive && user.status === UserStatus.ACTIVE })),
      skipDuplicates: true
    });
  }

  const legacyState = await prisma.appState.findUnique({ where: { userId: owner.id } });
  if (legacyState && legacyState.workspaceId !== workspace.id) {
    await prisma.appState.update({ where: { id: legacyState.id }, data: { workspaceId: workspace.id } });
  } else if (!legacyState) {
    await prisma.appState.create({ data: { userId: owner.id, workspaceId: workspace.id, state: EMPTY_STATE, revision: 1 } });
  }
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner.id } },
    create: { workspaceId: workspace.id, userId: owner.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true }
  });
  return workspace;
}

export async function addUserToPrimaryWorkspace(userId: string, role: UserRole, status: UserStatus, isActive: boolean) {
  const workspace = await ensurePrimaryWorkspace();
  if (!workspace) throw new Error('PRIMARY_WORKSPACE_NOT_AVAILABLE');
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    create: { workspaceId: workspace.id, userId, role, status, isActive },
    update: { role, status, isActive }
  });
}

export async function resolveWorkspaceContext(userId: string) {
  let membership = await prisma.workspaceMember.findFirst({
    where: { userId, isActive: true, status: UserStatus.ACTIVE, workspace: { isActive: true } },
    orderBy: { createdAt: 'asc' }, include: { workspace: true }
  });
  if (!membership) {
    await ensurePrimaryWorkspace();
    membership = await prisma.workspaceMember.findFirst({
      where: { userId, isActive: true, status: UserStatus.ACTIVE, workspace: { isActive: true } },
      orderBy: { createdAt: 'asc' }, include: { workspace: true }
    });
  }
  if (!membership) throw new Error('WORKSPACE_ACCESS_REQUIRED');
  return { workspaceId: membership.workspaceId, workspace: membership.workspace, membership };
}

export async function assertSameWorkspace(actorId: string, targetId: string) {
  const actor = await resolveWorkspaceContext(actorId);
  const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: targetId } } });
  if (!target) throw new Error('USER_NOT_IN_WORKSPACE');
  return { actor, target };
}

export async function currentWorkspaceForUser(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  return { id: context.workspace.id, name: context.workspace.name, slug: context.workspace.slug, role: context.membership.role, owner: context.workspace.ownerId === userId };
}