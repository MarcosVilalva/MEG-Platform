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
    update: { userId: user.id },
    create: {
      id: 'account-santander',
      userId: user.id,
      name: 'Santander',
      type: 'checking',
      institution: 'Santander',
      openingBalance: 0
    }
  });

  await Promise.all([
    prisma.category.upsert({
      where: { id: 'category-renda' },
      update: { userId: user.id },
      create: { id: 'category-renda', userId: user.id, name: 'Renda', group: 'Receitas', type: 'income' }
    }),
    prisma.category.upsert({
      where: { id: 'category-alimentacao' },
      update: { userId: user.id },
      create: { id: 'category-alimentacao', userId: user.id, name: 'Supermercado', group: 'Alimentação', type: 'expense' }
    }),
    prisma.category.upsert({
      where: { id: 'category-moradia' },
      update: { userId: user.id },
      create: { id: 'category-moradia', userId: user.id, name: 'Energia', group: 'Moradia', type: 'expense' }
    }),
    prisma.category.upsert({
      where: { id: 'category-cartao' },
      update: { userId: user.id },
      create: { id: 'category-cartao', userId: user.id, name: 'Fatura', group: 'Cartão', type: 'expense' }
    })
  ]);

  async function paymentMethod(name: string, type: string) {
    const existing = await prisma.paymentMethod.findFirst({ where: { userId: user.id, name } });
    if (existing) return existing;
    return prisma.paymentMethod.create({ data: { userId: user.id, name, type } });
  }

  const [pix, boleto, card, transfer] = await Promise.all([
    paymentMethod('PIX', 'instant'),
    paymentMethod('Boleto', 'bill'),
    paymentMethod('Cartão de crédito', 'credit'),
    paymentMethod('Transferência', 'transfer')
  ]);

  const existing = await prisma.financialEvent.count({ where: { userId: user.id } });

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