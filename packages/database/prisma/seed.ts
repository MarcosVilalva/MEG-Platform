import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'marcos@meg.local' },
    update: {},
    create: {
      name: 'Marcos Vilalva',
      email: 'marcos@meg.local'
    }
  });

  const santander = await prisma.account.upsert({
    where: { id: 'account-santander' },
    update: {},
    create: {
      id: 'account-santander',
      name: 'Santander',
      type: 'checking',
      institution: 'Santander',
      openingBalance: 0
    }
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'category-renda' },
      update: {},
      create: { id: 'category-renda', name: 'Renda', group: 'Receitas', type: 'income' }
    }),
    prisma.category.upsert({
      where: { id: 'category-alimentacao' },
      update: {},
      create: { id: 'category-alimentacao', name: 'Supermercado', group: 'Alimentação', type: 'expense' }
    }),
    prisma.category.upsert({
      where: { id: 'category-moradia' },
      update: {},
      create: { id: 'category-moradia', name: 'Energia', group: 'Moradia', type: 'expense' }
    }),
    prisma.category.upsert({
      where: { id: 'category-cartao' },
      update: {},
      create: { id: 'category-cartao', name: 'Fatura', group: 'Cartão', type: 'expense' }
    })
  ]);

  const pix = await prisma.paymentMethod.upsert({
    where: { name: 'PIX' },
    update: {},
    create: { name: 'PIX', type: 'instant' }
  });

  const boleto = await prisma.paymentMethod.upsert({
    where: { name: 'Boleto' },
    update: {},
    create: { name: 'Boleto', type: 'bill' }
  });

  const card = await prisma.paymentMethod.upsert({
    where: { name: 'Cartão de crédito' },
    update: {},
    create: { name: 'Cartão de crédito', type: 'credit' }
  });

  const transfer = await prisma.paymentMethod.upsert({
    where: { name: 'Transferência' },
    update: {},
    create: { name: 'Transferência', type: 'transfer' }
  });

  const existing = await prisma.financialEvent.count();

  if (existing === 0) {
    await prisma.financialEvent.createMany({
      data: [
        {
          userId: user.id,
          description: 'Receita principal',
          type: 'income',
          status: 'paid',
          date: new Date('2026-06-05'),
          competence: '2026-06',
          amount: 9000,
          signedAmount: 9000,
          accountId: santander.id,
          categoryId: 'category-renda',
          paymentMethodId: transfer.id
        },
        {
          userId: user.id,
          description: 'Mercado Rede Pas',
          type: 'expense',
          status: 'paid',
          date: new Date('2026-06-07'),
          competence: '2026-06',
          amount: 486.70,
          signedAmount: -486.70,
          accountId: santander.id,
          categoryId: 'category-alimentacao',
          paymentMethodId: pix.id
        },
        {
          userId: user.id,
          description: 'Fatura Verocard',
          type: 'expense',
          status: 'planned',
          date: new Date('2026-06-12'),
          competence: '2026-06',
          amount: 1820.45,
          signedAmount: -1820.45,
          accountId: santander.id,
          categoryId: 'category-cartao',
          paymentMethodId: card.id
        },
        {
          userId: user.id,
          description: 'Energia elétrica',
          type: 'expense',
          status: 'planned',
          date: new Date('2026-06-18'),
          competence: '2026-06',
          amount: 214.90,
          signedAmount: -214.90,
          accountId: santander.id,
          categoryId: 'category-moradia',
          paymentMethodId: boleto.id
        }
      ]
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
