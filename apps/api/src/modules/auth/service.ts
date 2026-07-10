import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma, UserRole, UserStatus } from '@meg/database';

const SESSION_TTL_DAYS = 30;
const ADMIN_EMAIL = 'm_vilalva@hotmail.com';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
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
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) throw new Error('EMAIL_ALREADY_REGISTERED');

  const hasAdmin = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  const isInitialAdmin = hasAdmin === 0 && email === ADMIN_EMAIL;
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: isInitialAdmin ? UserRole.ADMIN : UserRole.VIEWER,
      status: isInitialAdmin ? UserStatus.ACTIVE : UserStatus.PENDING,
      isActive: isInitialAdmin,
      approvedAt: isInitialAdmin ? new Date() : null
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      action: isInitialAdmin ? 'INITIAL_ADMIN_REGISTERED' : 'ACCESS_REQUESTED',
      metadata: JSON.stringify({ administratorEmail: ADMIN_EMAIL })
    }
  });

  return {
    user: publicUser(user),
    requiresApproval: !isInitialAdmin,
    administratorEmail: ADMIN_EMAIL
  };
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return { error: 'INVALID_CREDENTIALS' as const };
  if (user.status === UserStatus.PENDING) return { error: 'ACCESS_PENDING' as const };
  if (user.status === UserStatus.REJECTED) return { error: 'ACCESS_REJECTED' as const };
  if (user.status === UserStatus.BLOCKED || !user.isActive) return { error: 'USER_BLOCKED' as const };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: 'INVALID_CREDENTIALS' as const };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: publicUser(user) };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      approvedAt: true,
      rejectionNote: true
    }
  });
}

export async function updateUserAccess(input: {
  actorId: string;
  userId: string;
  action: 'APPROVE' | 'REJECT' | 'BLOCK' | 'ACTIVATE';
  role?: UserRole;
  note?: string;
}) {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error('USER_NOT_FOUND');
  if (target.email === ADMIN_EMAIL && input.action === 'BLOCK') throw new Error('PRIMARY_ADMIN_CANNOT_BE_BLOCKED');

  const data = input.action === 'APPROVE'
    ? { status: UserStatus.ACTIVE, isActive: true, role: input.role ?? UserRole.VIEWER, approvedAt: new Date(), approvedById: input.actorId, rejectedAt: null, rejectionNote: null }
    : input.action === 'REJECT'
      ? { status: UserStatus.REJECTED, isActive: false, rejectedAt: new Date(), rejectionNote: input.note ?? null }
      : input.action === 'BLOCK'
        ? { status: UserStatus.BLOCKED, isActive: false }
        : { status: UserStatus.ACTIVE, isActive: true, role: input.role ?? target.role };

  const updated = await prisma.user.update({ where: { id: input.userId }, data });
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

  return publicUser(updated);
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
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive || session.user.status !== UserStatus.ACTIVE) return null;
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return { sessionId: session.id, user: publicUser(session.user) };
}

export async function revokeRefreshSession(rawToken: string) {
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!session || session.revokedAt) return;
  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true }
  });
}