import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { config } from '../../config';
import { sendSystemEmail, sendSystemWhatsApp } from '../notifications/service';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PLAN_CODE = 'ESSENCIAL';

const DEFAULT_PLANS = [
  { code: 'ESSENCIAL', name: 'Essencial', description: 'Uso individual com os recursos financeiros principais.', maxMembers: 1, trialDays: 14, features: ['financeiro', 'alertas', 'backup'] },
  { code: 'FAMILIA', name: 'Família', description: 'Administrador e até cinco pessoas no mesmo espaço financeiro.', maxMembers: 6, trialDays: 14, features: ['financeiro', 'alertas', 'backup', 'usuarios', 'cartoes'] },
  { code: 'PRO', name: 'Pro', description: 'Gestão completa para equipes e clientes com mais acessos.', maxMembers: 10, trialDays: 14, features: ['financeiro', 'alertas', 'backup', 'usuarios', 'cartoes', 'relatorios'] }
] as const;

export async function ensureCommercialFoundation() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: { ...plan, features: plan.features as unknown as Prisma.InputJsonValue },
      update: { name: plan.name, description: plan.description, maxMembers: plan.maxMembers, trialDays: plan.trialDays, features: plan.features as unknown as Prisma.InputJsonValue, isActive: true }
    });
  }

  const administrator = await prisma.user.findUnique({ where: { email: config.adminEmail.trim().toLowerCase() } });
  if (administrator) {
    await prisma.platformAdministrator.upsert({
      where: { userId: administrator.id },
      create: { userId: administrator.id, isActive: true },
      update: { isActive: true }
    });
  }

  const defaultPlan = await prisma.plan.findUniqueOrThrow({ where: { code: DEFAULT_PLAN_CODE } });
  const workspaces = await prisma.workspace.findMany({ where: { subscription: null }, select: { id: true } });
  if (workspaces.length) {
    await prisma.workspaceSubscription.createMany({
      data: workspaces.map((workspace) => ({ workspaceId: workspace.id, planId: defaultPlan.id, status: LicenseStatus.ACTIVE, startsAt: new Date() })),
      skipDuplicates: true
    });
  }
}

export async function ensureWorkspaceSubscription(workspaceId: string, status: LicenseStatus = LicenseStatus.PENDING) {
  const existing = await prisma.workspaceSubscription.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: DEFAULT_PLAN_CODE } });
  return prisma.workspaceSubscription.create({ data: { workspaceId, planId: plan.id, status } });
}

export function effectiveLicenseStatus(subscription: { status: LicenseStatus; expiresAt: Date | null; graceUntil: Date | null }) {
  if (subscription.status !== LicenseStatus.ACTIVE && subscription.status !== LicenseStatus.TRIAL) return subscription.status;
  const now = Date.now();
  if (subscription.graceUntil && subscription.graceUntil.getTime() >= now) return subscription.status;
  if (subscription.expiresAt && subscription.expiresAt.getTime() < now) return LicenseStatus.EXPIRED;
  return subscription.status;
}

export async function assertWorkspaceWriteAccess(workspaceId: string) {
  const subscription = await prisma.workspaceSubscription.findUnique({ where: { workspaceId }, include: { plan: true } });
  if (!subscription) throw new Error('LICENSE_NOT_CONFIGURED');
  const status = effectiveLicenseStatus(subscription);
  if (status !== LicenseStatus.ACTIVE && status !== LicenseStatus.TRIAL) throw new Error(`LICENSE_${status}`);
  return subscription;
}

export async function workspaceSeatSummary(workspaceId: string) {
  const [subscription, usedMembers] = await Promise.all([
    prisma.workspaceSubscription.findUnique({ where: { workspaceId }, include: { plan: true } }),
    prisma.workspaceMember.count({ where: { workspaceId, status: { not: UserStatus.REJECTED } } })
  ]);
  if (!subscription) throw new Error('LICENSE_NOT_CONFIGURED');
  return {
    plan: { code: subscription.plan.code, name: subscription.plan.name },
    licenseStatus: effectiveLicenseStatus(subscription),
    storedLicenseStatus: subscription.status,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    graceUntil: subscription.graceUntil,
    members: { used: usedMembers, limit: subscription.plan.maxMembers, available: Math.max(0, subscription.plan.maxMembers - usedMembers) }
  };
}

export async function assertWorkspaceCapacity(workspaceId: string) {
  const summary = await workspaceSeatSummary(workspaceId);
  if (summary.members.available <= 0) throw new Error('WORKSPACE_MEMBER_LIMIT_REACHED');
  return summary;
}

export async function assertPlatformAdministrator(userId: string) {
  const administrator = await prisma.platformAdministrator.findUnique({ where: { userId } });
  if (!administrator?.isActive) throw new Error('PLATFORM_ADMIN_REQUIRED');
  return administrator;
}

export async function isPlatformAdministrator(userId: string) {
  return Boolean(await prisma.platformAdministrator.findFirst({ where: { userId, isActive: true }, select: { id: true } }));
}

export async function listCommercialWorkspaces() {
  const [plans, workspaces] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { maxMembers: 'asc' } }),
    prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true } },
        subscription: { include: { plan: true } },
        _count: { select: { members: { where: { status: { not: UserStatus.REJECTED } } } } }
      }
    })
  ]);
  return {
    plans: plans.map((plan) => ({ code: plan.code, name: plan.name, description: plan.description, maxMembers: plan.maxMembers, trialDays: plan.trialDays, features: plan.features })),
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id, name: workspace.name, slug: workspace.slug, isActive: workspace.isActive, createdAt: workspace.createdAt,
      owner: workspace.owner,
      members: { used: workspace._count.members, limit: workspace.subscription?.plan.maxMembers ?? 0 },
      license: workspace.subscription ? {
        status: effectiveLicenseStatus(workspace.subscription), storedStatus: workspace.subscription.status,
        startsAt: workspace.subscription.startsAt, expiresAt: workspace.subscription.expiresAt, graceUntil: workspace.subscription.graceUntil,
        plan: { code: workspace.subscription.plan.code, name: workspace.subscription.plan.name }
      } : null
    }))
  };
}

export async function updateCommercialLicense(input: {
  actorId: string;
  workspaceId: string;
  action: 'ACTIVATE' | 'START_TRIAL' | 'RENEW' | 'SUSPEND' | 'CANCEL' | 'CHANGE_PLAN';
  planCode?: string;
  durationDays?: number;
  notes?: string;
}) {
  await assertPlatformAdministrator(input.actorId);
  const workspace = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, include: { subscription: true, owner: true } });
  if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
  const plan = input.planCode
    ? await prisma.plan.findFirst({ where: { code: input.planCode, isActive: true } })
    : null;
  if (input.planCode && !plan) throw new Error('PLAN_NOT_FOUND');
  const subscription = workspace.subscription ?? await ensureWorkspaceSubscription(workspace.id);
  const now = new Date();
  const durationDays = Math.min(3650, Math.max(1, input.durationDays ?? (input.action === 'START_TRIAL' ? 14 : 30)));
  const currentExpiry = subscription.expiresAt && subscription.expiresAt > now ? subscription.expiresAt : now;
  const data = input.action === 'ACTIVATE'
    ? { status: LicenseStatus.ACTIVE, startsAt: subscription.startsAt ?? now, expiresAt: new Date(now.getTime() + durationDays * DAY_MS), graceUntil: null, suspendedAt: null }
    : input.action === 'START_TRIAL'
      ? { status: LicenseStatus.TRIAL, startsAt: now, expiresAt: new Date(now.getTime() + durationDays * DAY_MS), graceUntil: null, suspendedAt: null }
      : input.action === 'RENEW'
        ? { status: LicenseStatus.ACTIVE, startsAt: subscription.startsAt ?? now, expiresAt: new Date(currentExpiry.getTime() + durationDays * DAY_MS), graceUntil: null, suspendedAt: null }
        : input.action === 'SUSPEND'
          ? { status: LicenseStatus.SUSPENDED, suspendedAt: now }
          : input.action === 'CANCEL'
            ? { status: LicenseStatus.CANCELLED, suspendedAt: now }
            : { status: subscription.status };

  const updated = await prisma.workspaceSubscription.update({
    where: { id: subscription.id },
    data: { ...data, ...(plan ? { planId: plan.id } : {}), notes: input.notes ?? subscription.notes }
  });

  if (['ACTIVATE', 'START_TRIAL', 'RENEW'].includes(input.action)) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: workspace.ownerId }, data: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true, approvedAt: now, approvedById: input.actorId } }),
      prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: workspace.ownerId } }, data: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } })
    ]);
  }

  await prisma.auditLog.create({
    data: { userId: input.actorId, entity: 'Workspace', entityId: workspace.id, action: `LICENSE_${input.action}`, metadata: JSON.stringify({ planCode: plan?.code ?? null, durationDays, notes: input.notes ?? null }) }
  });
  const readableAction = input.action === 'ACTIVATE' ? 'ativada' : input.action === 'START_TRIAL' ? 'liberada para teste' : input.action === 'RENEW' ? 'renovada' : input.action === 'SUSPEND' ? 'suspensa' : input.action === 'CANCEL' ? 'cancelada' : 'atualizada';
  const expiryText = updated.expiresAt ? updated.expiresAt.toLocaleDateString('pt-BR') : 'sem vencimento definido';
  const notice = `Sua licença do MEG Finanças foi ${readableAction}. Plano: ${plan?.name ?? 'mantido'}. Validade: ${expiryText}.`;
  await Promise.allSettled([
    sendSystemEmail(workspace.owner.email, `MEG Finanças: licença ${readableAction}`, `Olá, ${workspace.owner.name}.\n\n${notice}\n\nAcesse o MEG para continuar.`),
    workspace.owner.phone ? sendSystemWhatsApp(workspace.owner.phone, `🔐 *MEG Finanças — Licença ${readableAction}*\n\n${notice}`) : Promise.resolve()
  ]);
  return { workspaceId: workspace.id, license: updated };
}
