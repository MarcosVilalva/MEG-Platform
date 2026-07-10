import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma, UserApprovalStatus, UserRole } from '@meg/database';

const SESSION_TTL_DAYS = 30;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'm_vilalva@hotmail.com').trim().toLowerCase();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} as const;

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_ALREADY_REGISTERED');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userCount = await prisma.user.count();
  const isBootstrapAdmin = userCount === 0 || email === ADMIN_EMAIL;

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: isBootstrapAdmin ? UserRole.ADMIN : UserRole.VIEWER,
      approvalStatus: isBootstrapAdmin ? UserApprovalStatus.APPROVED : UserApprovalStatus.PENDING,
      isActive: isBootstrapAdmin,
      approvedAt: isBootstrapAdmin ? new Date() : null
    },
    select: publicUserSelect
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      action: isBootstrapAdmin ? 'REGISTER_ADMIN' : 'REQUEST_ACCESS',
      metadata: JSON.stringify({ administratorEmail: ADMIN_EMAIL })
    }
  });

  return { user, requiresApproval: !isBootstrapAdmin, administratorEmail: ADMIN_EMAIL };
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { status: 'INVALID' as const };
  if (user.approvalStatus === UserApprovalStatus.PENDING) return { status: 'PENDING' as const };
  if (user.approvalStatus === UserApprovalStatus.REJECTED) return { status: 'REJECTED' as const };
  if (!user.isActive) return { status: 'INACTIVE' as const };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { status: 'INVALID' as const };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { status: 'OK' as const, user: {
    id: user.id, name: user.name, email: user.email, role: user.role,
    approvalStatus: user.approvalStatus, isActive: user.isActive
  }};
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: [{ approvalStatus: 'asc' }, { createdAt: 'desc' }], select: publicUserSelect });
}

export async function updateUserAccess(input: {
  actorId: string;
  userId: string;
  role?: UserRole;
  approvalStatus?: UserApprovalStatus;
  isActive?: boolean;
}) {
  const current = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!current) throw new Error('USER_NOT_FOUND');

  const approvalStatus = input.approvalStatus ?? current.approvalStatus;
  const isActive = input.isActive ?? (approvalStatus === UserApprovalStatus.APPROVED ? true : current.isActive);

  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      role: input.role,
      approvalStatus,
      isActive: approvalStatus === UserApprovalStatus.REJECTED ? false : isActive,
      approvedAt: approvalStatus === UserApprovalStatus.APPROVED ? (current.approvedAt ?? new Date()) : current.approvedAt,
      approvedById: approvalStatus === UserApprovalStatus.APPROVED ? input.actorId : current.approvedById,
      rejectedAt: approvalStatus === UserApprovalStatus.REJECTED ? new Date() : null
    },
    select: publicUserSelect
  });

  if (!user.isActive) {
    await prisma.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  await prisma.auditLog.create({
    data: {
      userId: input.actorId,
      entity: 'User',
      entityId: user.id,
      action: 'UPDATE_ACCESS',
      metadata: JSON.stringify({ role: user.role, approvalStatus: user.approvalStatus, isActive: user.isActive })
    }
  });
  return user;
}

export async function createRefreshSession(input: { userId: string; ipAddress?: string; userAgent?: string }) {
  const rawToken = randomBytes(48).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.authSession.create({ data: { userId: input.userId, tokenHash, expiresAt, ipAddress: input.ipAddress, userAgent: input.userAgent } });
  return { token: rawToken, sessionId: session.id, expiresAt };
}

export async function consumeRefreshSession(rawToken: string) {
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive || session.user.approvalStatus !== UserApprovalStatus.APPROVED) return null;
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return { sessionId: session.id, user: {
    id: session.user.id, name: session.user.name, email: session.user.email,
    role: session.user.role, approvalStatus: session.user.approvalStatus, isActive: session.user.isActive
  }};
}

export async function revokeRefreshSession(rawToken: string) {
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!session || session.revokedAt) return;
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
}