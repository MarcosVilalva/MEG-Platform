import { PrismaClient as PostgresClient } from '@prisma/client';
import { PrismaClient as SqliteClient } from '../generated/sqlite-client/index.js';

if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  throw new Error('DATABASE_URL deve apontar para o PostgreSQL do Supabase.');
}
if (!process.env.LEGACY_DATABASE_URL?.startsWith('file:')) {
  throw new Error('LEGACY_DATABASE_URL deve apontar para o arquivo SQLite local.');
}

const source = new SqliteClient();
const target = new PostgresClient();

async function migrate() {
  const users = await source.user.findMany();
  for (const row of users) await target.user.upsert({ where: { id: row.id }, update: row, create: row });

  const accounts = await source.account.findMany();
  for (const row of accounts) await target.account.upsert({ where: { id: row.id }, update: row, create: row });

  const categories = await source.category.findMany();
  for (const row of categories) await target.category.upsert({ where: { id: row.id }, update: row, create: row });

  const methods = await source.paymentMethod.findMany();
  for (const row of methods) await target.paymentMethod.upsert({ where: { id: row.id }, update: row, create: row });

  const events = await source.financialEvent.findMany();
  for (const row of events) await target.financialEvent.upsert({ where: { id: row.id }, update: row, create: row });

  const ledger = await source.ledgerEntry.findMany();
  for (const row of ledger) await target.ledgerEntry.upsert({ where: { id: row.id }, update: row, create: row });

  const customers = await source.customer.findMany();
  for (const row of customers) await target.customer.upsert({ where: { id: row.id }, update: row, create: row });

  const receivables = await source.receivable.findMany();
  for (const row of receivables) await target.receivable.upsert({ where: { id: row.id }, update: row, create: row });

  const receipts = await source.receipt.findMany();
  for (const row of receipts) await target.receipt.upsert({ where: { id: row.id }, update: row, create: row });

  const budgets = await source.budget.findMany();
  for (const row of budgets) await target.budget.upsert({ where: { id: row.id }, update: row, create: row });

  const auditLogs = await source.auditLog.findMany();
  for (const row of auditLogs) await target.auditLog.upsert({ where: { id: row.id }, update: row, create: row });

  console.log(JSON.stringify({
    users: users.length, accounts: accounts.length, categories: categories.length,
    paymentMethods: methods.length, financialEvents: events.length, ledgerEntries: ledger.length,
    customers: customers.length, receivables: receivables.length, receipts: receipts.length,
    budgets: budgets.length, auditLogs: auditLogs.length
  }, null, 2));
}

migrate()
  .then(() => console.log('Migração SQLite ? Supabase concluída.'))
  .finally(async () => { await source.$disconnect(); await target.$disconnect(); });
