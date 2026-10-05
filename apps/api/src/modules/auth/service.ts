import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma, UserRole, UserStatus } from '@meg/database';
import { sendSystemEmail, sendSystemWhatsApp } from '../notifications/service';
import { config } from '../../config';
import { createPasswordResetToken, createTemporaryPassword, normalizeAccountEmail, passwordResetLink, passwordResetLinkMessages, passwordResetMessages } from './password-reset';
import { addUserToRequestedWorkspace, assertSameWorkspace, createWorkspaceForOwner, currentWorkspaceForUser, ensurePrimaryWorkspace, resolveWorkspaceContext } from '../workspaces/service';
import { workspaceSeatSummary } from '../platform-admin/service';

const SESSION_TTL_DAYS = 30;
const ADMIN_EMAIL = normalizeAccountEmail(config.adminEmail);

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    platformAdmin: normalizeAccountEmail(user.email) === ADMIN_EMAIL
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  accountType?: 'REQUEST_ACCESS' | 'CREATE_WORKSPACE';
  workspaceName?: string;
  workspaceSlug?: string;
  planCode?: 'ESSENCIAL' | 'FAMILIA' | 'PRO';
}) {
  const email = normalizeAccountEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.status === UserStatus.PENDING) throw new Error('ACCESS_PENDING');
  if (existing) throw new Error('EMAIL_ALREADY_REGISTERED');

  const createsWorkspace = input.accountType === 'CREATE_WORKSPACE';
  const hasAdmin = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  const isInitialAdmin = hasAdmin === 0 && email === ADMIN_EMAIL;
  const isWorkspaceOwner = createsWorkspace || isInitialAdmin;
  const approvedImmediately = isInitialAdmin;
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(), email, phone: normalizePhone(input.phone), passwordHash,
      role: isWorkspaceOwner ? UserRole.ADMIN : UserRole.VIEWER,
      status: approvedImmediately ? UserStatus.ACTIVE : UserStatus.PENDING,
      isActive: approvedImmediately, approvedAt: approvedImmediately ? new Date() : null
    }
  });
  let approvalEmail = ADMIN_EMAIL;
  let requestedWorkspaceName = input.workspaceName ?? null;
  try {
    if (createsWorkspace) {
      await createWorkspaceForOwner(user.id, input.workspaceName?.trim() || `Finanças de ${user.name}`, !approvedImmediately, input.planCode || 'ESSENCIAL');
    } else if (isInitialAdmin) {
      await ensurePrimaryWorkspace();
    } else {
      const requestedWorkspace = await addUserToRequestedWorkspace(user.id, input.workspaceSlug);
      approvalEmail = requestedWorkspace.owner.email;
      requestedWorkspaceName = requestedWorkspace.name;
    }
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw error;
  }
  await prisma.auditLog.create({
    data: {
      userId: user.id, entity: 'User', entityId: user.id,
      action: createsWorkspace ? 'COMMERCIAL_WORKSPACE_REQUESTED' : isInitialAdmin ? 'INITIAL_ADMIN_REGISTERED' : 'ACCESS_REQUESTED',
      metadata: JSON.stringify({ administratorEmail: approvalEmail, workspaceName: requestedWorkspaceName, workspaceSlug: input.workspaceSlug ?? null, planCode: input.planCode ?? null })
    }
  });
  if (!approvedImmediately) {
    const subject = createsWorkspace ? `MEG Comercial: novo cliente ${user.name}` : `MEG Finanças: nova solicitação de ${user.name}`;
    const body = createsWorkspace
      ? `Novo cliente aguardando ativação.\n\nResponsável: ${user.name}\nE-mail: ${user.email}\nEspaço: ${requestedWorkspaceName}\n\nAcesse Gestão comercial para escolher o plano e ativar a licença.`
      : `${user.name} (${user.email}) solicitou acesso ao espaço ${requestedWorkspaceName}.\n\nAcesse Usuários e permissões para analisar a solicitação.`;
    await sendSystemEmail(approvalEmail, subject, body).catch(() => undefined);
  }
  return { user: publicUser(user), requiresApproval: !approvedImmediately, administratorEmail: approvalEmail };
}
export async function authenticateUser(emailInput: string, password: string) {
  const email = normalizeAccountEmail(emailInput);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return { error: 'ACCOUNT_NOT_FOUND' as const };
  if (user.status === UserStatus.PENDING) return { error: 'ACCESS_PENDING' as const };
  if (user.status === UserStatus.REJECTED) return { error: 'ACCESS_REJECTED' as const };
  if (user.status === UserStatus.BLOCKED || !user.isActive) return { error: 'USER_BLOCKED' as const };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: 'INVALID_CREDENTIALS' as const };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: publicUser(user) };
}

export async function listUsers(actorId: string) {
  const context = await resolveWorkspaceContext(actorId);
  const users = await prisma.user.findMany({
    where: { workspaceMemberships: { some: { workspaceId: context.workspaceId } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      approvedAt: true,
      rejectionNote: true
    }
  });
  return { users, workspace: { id: context.workspace.id, name: context.workspace.name, slug: context.workspace.slug, commercial: await workspaceSeatSummary(context.workspaceId) } };
}
export async function updateUserAccess(input: {
  actorId: string;
  userId: string;
  action: 'APPROVE' | 'REJECT' | 'BLOCK' | 'ACTIVATE' | 'UPDATE';
  role?: UserRole;
  phone?: string;
  note?: string;
}) {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error('USER_NOT_FOUND');
  const scope = await assertSameWorkspace(input.actorId, input.userId);
  if (scope.actor.workspace.ownerId === target.id && input.action === 'BLOCK') throw new Error('PRIMARY_ADMIN_CANNOT_BE_BLOCKED');

  const data = input.action === 'APPROVE'
    ? { status: UserStatus.ACTIVE, isActive: true, role: input.role ?? UserRole.VIEWER, phone: normalizePhone(input.phone) ?? target.phone, approvedAt: new Date(), approvedById: input.actorId, rejectedAt: null, rejectionNote: null }
    : input.action === 'REJECT'
      ? { status: UserStatus.REJECTED, isActive: false, rejectedAt: new Date(), rejectionNote: input.note ?? null }
      : input.action === 'BLOCK'
        ? { status: UserStatus.BLOCKED, isActive: false }
        : input.action === 'ACTIVATE'
          ? { status: UserStatus.ACTIVE, isActive: true, role: input.role ?? target.role, phone: normalizePhone(input.phone) ?? target.phone }
          : { role: input.role ?? target.role, phone: normalizePhone(input.phone) ?? target.phone };

  const updated = await prisma.user.update({ where: { id: input.userId }, data });
  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: scope.actor.workspaceId, userId: updated.id } },
    data: { role: updated.role, status: updated.status, isActive: updated.isActive }
  });
  if (!updated.isActive) {
    await prisma.authSession.updateMany({ where: { userId: updated.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  await prisma.auditLog.create({
    data: {
      userId: input.actorId,
      entity: 'User',
      entityId: updated.id,
      action: `ACCESS_${input.action}`,
      metadata: JSON.stringify({ role: updated.role, note: input.note ?? null })
    }
  });

  const accessMessages = {
    APPROVE: `Seu acesso ao MEG Finanças foi aprovado com o perfil ${updated.role}. Você já pode entrar com sua senha cadastrada.`,
    REJECT: `Sua solicitação de acesso ao MEG Finanças foi rejeitada.${input.note ? ` Motivo: ${input.note}` : ''}`,
    BLOCK: 'Seu acesso ao MEG Finanças foi bloqueado pelo administrador.',
    ACTIVATE: `Seu acesso ao MEG Finanças foi reativado com o perfil ${updated.role}.`,
    UPDATE: 'Seus dados de acesso ao MEG Finanças foram atualizados pelo administrador.'
  };
  const notifications = input.action === 'UPDATE' ? [] : await notifyUser(
    updated,
    `MEG Finanças: acesso ${input.action === 'APPROVE' ? 'aprovado' : input.action === 'ACTIVATE' ? 'reativado' : input.action === 'BLOCK' ? 'bloqueado' : 'não aprovado'}`,
    `Olá, ${updated.name}.\n\n${accessMessages[input.action]}\n\nMEG Finanças — Seus dados protegidos.`,
    `🔐 *MEG Finanças — Controle de acesso*\n\nOlá, *${updated.name}*!\n\n${accessMessages[input.action]}\n\n🤖 MEG Finanças — Seus dados protegidos.`
  );

  return { user: publicUser(updated), notifications };
}

async function notifyUser(
  target: { email: string; phone?: string | null },
  subject: string,
  emailText: string,
  whatsappText: string
) {
  const email = await sendSystemEmail(normalizeAccountEmail(target.email), subject, emailText)
    .catch((error) => ({ status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' }));
  const whatsapp = target.phone
    ? await sendSystemWhatsApp(target.phone, whatsappText)
      .catch((error) => ({ status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' }))
    : { status: 'skipped', detail: 'Telefone não cadastrado' };
  return [
    { channel: 'email', ...email },
    { channel: 'whatsapp', ...whatsapp }
  ];
}

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeAccountEmail(emailInput);
  const target = await prisma.user.findUnique({ where: { email } });

  // Resposta deliberadamente genérica para não permitir enumeração de contas.
  if (!target || !target.isActive || target.status !== UserStatus.ACTIVE) {
    return { accepted: true, notifications: [] as Array<{ channel: string; status: string; detail?: string }> };
  }

  const requestedAt = new Date();
  const throttleBefore = new Date(requestedAt.getTime() - 10 * 60 * 1000);
  const { token, tokenHash } = createPasswordResetToken();
  const expiresAt = new Date(requestedAt.getTime() + 20 * 60 * 1000);

  // A reserva condicional evita que solicitações concorrentes emitam dois links,
  // situação em que o segundo token invalidaria silenciosamente o primeiro.
  const claimed = await prisma.user.updateMany({
    where: {
      id: target.id,
      OR: [
        { passwordResetRequestedAt: null },
        { passwordResetRequestedAt: { lt: throttleBefore } }
      ]
    },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
      passwordResetRequestedAt: requestedAt
    }
  });
  if (claimed.count !== 1) {
    return { accepted: true, notifications: [] as Array<{ channel: string; status: string; detail?: string }> };
  }

  const link = passwordResetLink(token);
  const messages = passwordResetLinkMessages(target, link);
  const notifications = await notifyUser(
    target,
    messages.subject,
    messages.emailText,
    messages.whatsappText
  );

  if (!notifications.some((item) => item.status === 'sent')) {
    await prisma.user.updateMany({
      where: { id: target.id, passwordResetTokenHash: tokenHash },
      data: { passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetRequestedAt: null }
    });
    throw new Error('NOTIFICATION_DELIVERY_FAILED');
  }

  await prisma.auditLog.create({
    data: {
      userId: target.id,
      entity: 'User',
      entityId: target.id,
      action: 'PASSWORD_RESET_LINK_REQUESTED',
      metadata: JSON.stringify({ expiresAt: expiresAt.toISOString(), channels: notifications.map((item) => ({ channel: item.channel, status: item.status })) })
    }
  });

  return { accepted: true, notifications };
}

export async function consumePasswordResetToken(input: { token: string; password: string }) {
  const tokenHash = hashToken(input.token);
  const now = new Date();
  const target = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash } });
  if (
    !target
    || !target.isActive
    || target.status !== UserStatus.ACTIVE
    || !target.passwordResetExpiresAt
    || target.passwordResetExpiresAt <= now
  ) {
    throw new Error('INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.user.updateMany({
      where: {
        id: target.id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: now }
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null
      }
    });
    if (consumed.count !== 1) throw new Error('INVALID_RESET_TOKEN');

    await tx.authSession.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: now }
    });

    await tx.auditLog.create({
      data: {
        userId: target.id,
        entity: 'User',
        entityId: target.id,
        action: 'PASSWORD_RESET_LINK_CONSUMED',
        metadata: JSON.stringify({ completedAt: now.toISOString() })
      }
    });
  });

  return { status: 'PASSWORD_RESET_COMPLETED' as const };
}

export async function resetUserPassword(input: { actorId: string; userId: string }) {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error('USER_NOT_FOUND');
  await assertSameWorkspace(input.actorId, input.userId);
  if (!target.isActive || target.status !== UserStatus.ACTIVE) throw new Error('USER_NOT_ACTIVE');

  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const messages = passwordResetMessages(target, temporaryPassword, true);
  const notifications = await notifyUser(
    target,
    messages.subject,
    messages.emailText,
    messages.whatsappText
  );
  if (!notifications.some((item) => item.status === 'sent')) throw new Error('NOTIFICATION_DELIVERY_FAILED');

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { passwordHash } }),
    prisma.authSession.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        userId: input.actorId,
        entity: 'User',
        entityId: target.id,
        action: 'PASSWORD_RESET_BY_ADMIN',
        metadata: JSON.stringify({ deliveredTo: target.email })
      }
    })
  ]);

  return { user: publicUser(target), deliveredTo: target.email, notifications };
}

export async function testUserEmail(input: { actorId: string; userId: string }) {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error('USER_NOT_FOUND');
  await assertSameWorkspace(input.actorId, input.userId);

  const deliveredTo = normalizeAccountEmail(target.email);
  const email = await sendSystemEmail(
    deliveredTo,
    'MEG Finanças: teste de entrega',
    `Olá, ${target.name}.\n\nEste é um teste do canal de e-mail do MEG Finanças. Nenhuma senha foi alterada.\n\nSe você recebeu esta mensagem, o endereço está pronto para receber avisos de acesso e recuperação de senha.\n\nMEG Finanças — Segurança e controle.`
  ).catch((error) => ({ status: 'failed', detail: error instanceof Error ? error.message : 'Falha desconhecida' }));

  await prisma.auditLog.create({
    data: {
      userId: input.actorId,
      entity: 'User',
      entityId: target.id,
      action: 'EMAIL_DELIVERY_TESTED',
      metadata: JSON.stringify({ deliveredTo, status: email.status })
    }
  });

  return { deliveredTo, email };
}

export async function deleteUserAccess(input: { actorId: string; userId: string }) {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error('USER_NOT_FOUND');
  const scope = await assertSameWorkspace(input.actorId, input.userId);
  if (scope.actor.workspace.ownerId === target.id) throw new Error('PRIMARY_ADMIN_CANNOT_BE_DELETED');
  if (target.id === input.actorId) throw new Error('CANNOT_DELETE_OWN_ACCESS');
  if (target.isActive || target.status === UserStatus.ACTIVE) throw new Error('USER_MUST_BE_INACTIVE_BEFORE_DELETE');

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        userId: input.actorId,
        entity: 'User',
        entityId: target.id,
        action: 'ACCESS_DELETED',
        metadata: JSON.stringify({ name: target.name, email: target.email, phone: target.phone })
      }
    }),
    prisma.financialEvent.updateMany({ where: { userId: target.id }, data: { userId: null } }),
    prisma.user.delete({ where: { id: target.id } })
  ]);
  return { id: target.id, deleted: true };
}

export async function createRefreshSession(input: { userId: string; ipAddress?: string; userAgent?: string }) {
  const rawToken = randomBytes(48).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.authSession.create({ data: { userId: input.userId, tokenHash, expiresAt, ipAddress: input.ipAddress, userAgent: input.userAgent } });
  return { token: rawToken, sessionId: session.id, expiresAt };
}

export async function consumeRefreshSession(rawToken: string) {
  const now = new Date();
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.isActive || session.user.status !== UserStatus.ACTIVE) return null;

  // Refresh tokens são de uso único. A atualização condicional torna o consumo
  // atômico e impede que duas requisições concorrentes reutilizem a mesma sessão.
  const consumed = await prisma.authSession.updateMany({
    where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now }
  });
  if (consumed.count !== 1) return null;

  return { sessionId: session.id, user: publicUser(session.user) };
}

export async function revokeRefreshSession(rawToken: string) {
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!session || session.revokedAt) return;
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
}

function sessionDeviceLabel(userAgent?: string | null) {
  const ua = String(userAgent || '');
  const android = ua.match(/Android\s+[\d.]+;\s*([^;)]+)/i)?.[1]?.trim();
  if (android) return android.replace(/\s+Build\/.*$/i, '').trim();
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Windows/i.test(ua)) return 'Computador Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Computador Linux';
  return /Mobile/i.test(ua) ? 'Dispositivo móvel' : 'Navegador Web';
}

export async function listAuthSessions(actorId: string) {
  const context = await resolveWorkspaceContext(actorId);
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  const admin = actor?.role === UserRole.ADMIN;
  const sessions = await prisma.authSession.findMany({
    where: admin
      ? { user: { workspaceMemberships: { some: { workspaceId: context.workspaceId } } } }
      : { userId: actorId },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: admin ? 100 : 20
  });
  const now = Date.now();
  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      userName: session.user.name,
      deviceName: sessionDeviceLabel(session.userAgent),
      platform: /Android/i.test(session.userAgent || '') ? 'Android' : /iPhone|iPad/i.test(session.userAgent || '') ? 'iOS' : 'Web',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastLoginAt: session.user.lastLoginAt,
      active: !session.revokedAt && session.expiresAt.getTime() > now,
      revokedAt: session.revokedAt,
      userAgent: admin ? session.userAgent : undefined
    }))
  };
}

export async function revokeAuthSession(actorId: string, sessionId: string) {
  const context = await resolveWorkspaceContext(actorId);
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
  const target = await prisma.authSession.findUnique({ where: { id: sessionId }, include: { user: { select: { id: true, workspaceMemberships: true } } } });
  if (!target) throw new Error('SESSION_NOT_FOUND');
  const sameWorkspace = target.user.workspaceMemberships.some((member) => member.workspaceId === context.workspaceId);
  if (target.userId !== actorId && (actor?.role !== UserRole.ADMIN || !sameWorkspace)) throw new Error('SESSION_NOT_FOUND');
  await prisma.authSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  return { revoked: true };
}

export async function updateOwnProfile(userId: string, input: { name: string; phone?: string | null }) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  if (!current || !current.isActive) throw new Error('USER_NOT_AVAILABLE');

  const nextName = input.name.trim();
  if (nextName.length < 2 || nextName.length > 120) throw new Error('INVALID_PROFILE_NAME');
  const nextPhone = input.phone === undefined ? current.phone : normalizePhone(input.phone);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { name: nextName, phone: nextPhone },
    });
    await tx.auditLog.create({
      data: {
        userId,
        entity: 'User',
        entityId: userId,
        action: 'PROFILE_UPDATED',
        metadata: JSON.stringify({
          schemaVersion: 1,
          before: { name: current.name, phone: current.phone ?? null },
          after: { name: user.name, phone: user.phone ?? null },
        }),
      },
    });
    return user;
  });

  return publicUser(updated);
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true }
  });
  if (!user) return null;
  const workspace = await currentWorkspaceForUser(userId);
  return { ...user, workspace };
}