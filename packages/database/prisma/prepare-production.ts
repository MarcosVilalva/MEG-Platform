import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.startsWith('postgres')) {
  console.log('Preparação de produção ignorada: banco local não é PostgreSQL.');
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  const columns = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Budget' AND column_name = 'userId'
    ) AS exists
  `);
  const hasUserId = Boolean(columns[0]?.exists);
  const partitionColumns = hasUserId ? '"userId", "month", "group"' : '"month", "group"';

  const duplicates = await prisma.$queryRawUnsafe<Array<{ groups: bigint; rows: bigint }>>(`
    SELECT COUNT(*)::bigint AS groups, COALESCE(SUM(total - 1), 0)::bigint AS rows
    FROM (
      SELECT COUNT(*) AS total
      FROM "Budget"
      GROUP BY ${partitionColumns}
      HAVING COUNT(*) > 1
    ) duplicated
  `);

  const duplicateGroups = Number(duplicates[0]?.groups || 0);
  const duplicateRows = Number(duplicates[0]?.rows || 0);

  if (duplicateRows > 0) {
    const removed = await prisma.$executeRawUnsafe(`
      WITH ranked AS (
        SELECT "id",
               ROW_NUMBER() OVER (
                 PARTITION BY ${partitionColumns}
                 ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
               ) AS position
        FROM "Budget"
      )
      DELETE FROM "Budget"
      WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1)
    `);
    console.log(JSON.stringify({ step: 'deduplicate-budgets', legacySchema: !hasUserId, duplicateGroups, expectedDuplicateRows: duplicateRows, removed }));
  } else {
    console.log(JSON.stringify({ step: 'deduplicate-budgets', legacySchema: !hasUserId, duplicateGroups: 0, removed: 0 }));
  }
} finally {
  await prisma.$disconnect();
}
