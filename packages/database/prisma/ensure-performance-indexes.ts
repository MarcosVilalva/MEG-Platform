import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.startsWith('postgres')) {
  console.log('Índices de produção ignorados: banco local não é PostgreSQL.');
  process.exit(0);
}

const prisma = new PrismaClient();

const indexes = [
  {
    name: 'FinancialEvent_user_active_date_idx',
    sql: `CREATE INDEX IF NOT EXISTS "FinancialEvent_user_active_date_idx"
          ON "FinancialEvent" ("userId", "date")
          WHERE "archivedAt" IS NULL`,
  },
  {
    name: 'FinancialEvent_user_active_status_date_idx',
    sql: `CREATE INDEX IF NOT EXISTS "FinancialEvent_user_active_status_date_idx"
          ON "FinancialEvent" ("userId", "status", "date")
          WHERE "archivedAt" IS NULL`,
  },
  {
    name: 'FinancialEvent_accountId_idx',
    sql: `CREATE INDEX IF NOT EXISTS "FinancialEvent_accountId_idx"
          ON "FinancialEvent" ("accountId")`,
  },
  {
    name: 'FinancialEvent_categoryId_idx',
    sql: `CREATE INDEX IF NOT EXISTS "FinancialEvent_categoryId_idx"
          ON "FinancialEvent" ("categoryId")`,
  },
  {
    name: 'FinancialEvent_paymentMethodId_idx',
    sql: `CREATE INDEX IF NOT EXISTS "FinancialEvent_paymentMethodId_idx"
          ON "FinancialEvent" ("paymentMethodId")`,
  },
] as const;

try {
  for (const index of indexes) {
    await prisma.$executeRawUnsafe(index.sql);
  }

  const installed = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'FinancialEvent'
      AND indexname IN (${indexes.map((item) => `'${item.name}'`).join(', ')})
    ORDER BY indexname
  `);

  const found = new Set(installed.map((item) => item.indexname));
  const missing = indexes.map((item) => item.name).filter((name) => !found.has(name));
  if (missing.length) {
    throw new Error(`FINANCIAL_EVENT_INDEXES_MISSING:${missing.join(',')}`);
  }

  console.log(JSON.stringify({
    step: 'ensure-financial-event-indexes',
    installed: indexes.map((item) => item.name),
  }));
} finally {
  await prisma.$disconnect();
}
