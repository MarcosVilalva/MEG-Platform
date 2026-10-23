import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
try {
  const email = 'homolog.pr643@example.test';
  if (!process.env.MEG_TEST_PASSWORD || process.env.NODE_ENV !== 'test') {
    throw new Error('Ephemeral test credentials and NODE_ENV=test are required.');
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error('Ephemeral fixture must start from a clean database.');

  const plan = await db.plan.create({
    data: { code: 'ESSENCIAL', name: 'Plano Fictício de Homologação', features: {}, maxMembers: 2 }
  });
  const user = await db.user.create({
    data: {
      email,
      name: 'Conta Fictícia QA',
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      passwordHash: await bcrypt.hash(process.env.MEG_TEST_PASSWORD, 12)
    }
  });
  await db.workspace.create({
    data: {
      name: 'Workspace Fictício de Homologação',
      slug: 'pr643-test-workspace',
      ownerId: user.id,
      members: { create: { userId: user.id, role: 'ADMIN', status: 'ACTIVE', isActive: true } },
      subscription: { create: { planId: plan.id, status: 'ACTIVE' } }
    }
  });
  process.stdout.write('EPHEMERAL_ACCOUNT_WORKSPACE_AND_LICENSE_CREATED=true\n');
} finally {
  await db.$disconnect();
}
