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
  await db.user.create({
    data: {
      email,
      name: 'Conta Fictícia QA',
      role: 'VIEWER',
      status: 'ACTIVE',
      isActive: true,
      passwordHash: await bcrypt.hash(process.env.MEG_TEST_PASSWORD, 12)
    }
  });
  process.stdout.write('EPHEMERAL_TEST_ACCOUNT_CREATED=true\n');
} finally {
  await db.$disconnect();
}
