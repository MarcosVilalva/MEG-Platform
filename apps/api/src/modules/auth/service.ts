import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma, UserRole } from '@meg/database';

const SESSION_TTL_DAYS = 30;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role ?? UserRole.VIEWER
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'REGISTER'
    }
  });

  return user;
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

export async function createRefreshSession(input: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const rawToken = randomBytes(48).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.authSession.create({
    data: {
      userId: input.userId,
      tokenHash,
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });

  return { token: rawToken, sessionId: session.id, expiresAt };
}

export async function consumeRefreshSession(rawToken: string) {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }

  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      isActive: session.user.isActive
    }
  };
}

export async function revokeRefreshSession(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.authSession.findUnique({ where: { tokenHash } });

  if (!session || session.revokedAt) return;

  await prisma.authSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
