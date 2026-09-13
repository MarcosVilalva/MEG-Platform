import { PrismaClient } from '@prisma/client';
import { auditIncomePaymentMethods } from './income-payment-method-policy';

const prisma = new PrismaClient();

async function main() {
  const [accounts, categories, paymentMethods] = await Promise.all([
    prisma.account.findMany({ select: { userId: true } }),
    prisma.category.findMany({ select: { userId: true } }),
    prisma.paymentMethod.findMany({ select: { id: true, name: true, userId: true, isActive: true } }),
  ]);

  const ownerIds = [...new Set([
    ...accounts.map((item) => item.userId),
    ...categories.map((item) => item.userId),
    ...paymentMethods.map((item) => item.userId),
  ].filter((value): value is string => Boolean(value)))].sort();

  const owners = ownerIds.map((ownerId, index) => {
    const audit = auditIncomePaymentMethods(paymentMethods, ownerId);
    return {
      owner: index + 1,
      available: audit.available.map((item) => item.name),
      missing: audit.missing,
      ready: audit.ready,
    };
  });

  const report = {
    mode: 'dry-run',
    generatedAt: new Date().toISOString(),
    authority: 'user',
    required: ['PIX', 'DINHEIRO', 'DEPÓSITO BANCÁRIO'],
    owners,
    ready: owners.length > 0 && owners.every((item) => item.ready),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
