import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(path, oldText, newText) {
  const current = read(path);
  if (!current.includes(oldText)) {
    throw new Error(`Expected block not found in ${path}: ${oldText.slice(0, 120)}`);
  }
  write(path, current.replace(oldText, newText));
}

// 1) FinancialEvent legacy create/update cannot attach another user's catalogs.
{
  const path = 'apps/api/src/modules/finance/service.ts';
  let text = read(path);
  const oldBlock = `async function validateActiveReferences(tx: Tx, input: { accountId?: string; categoryId?: string; paymentMethodId?: string }) {
  if (input.accountId) {
    const account = await tx.account.findFirst({ where: { id: input.accountId, isActive: true }, select: { id: true } });
    if (!account) throw new Error('INVALID_ACCOUNT');
  }
  if (input.categoryId) {
    const category = await tx.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true } });
    if (!category) throw new Error('INVALID_CATEGORY');
  }
  if (input.paymentMethodId) {
    const method = await tx.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true }, select: { id: true } });
    if (!method) throw new Error('INVALID_PAYMENT_METHOD');
  }
}`;
  const newBlock = `async function validateActiveReferences(tx: Tx, userId: string, input: { accountId?: string; categoryId?: string; paymentMethodId?: string }) {
  if (input.accountId) {
    const account = await tx.account.findFirst({ where: { id: input.accountId, userId, isActive: true }, select: { id: true } });
    if (!account) throw new Error('INVALID_ACCOUNT');
  }
  if (input.categoryId) {
    const category = await tx.category.findFirst({ where: { id: input.categoryId, userId, isActive: true }, select: { id: true } });
    if (!category) throw new Error('INVALID_CATEGORY');
  }
  if (input.paymentMethodId) {
    const method = await tx.paymentMethod.findFirst({ where: { id: input.paymentMethodId, userId, isActive: true }, select: { id: true } });
    if (!method) throw new Error('INVALID_PAYMENT_METHOD');
  }
}`;
  if (!text.includes(oldBlock)) throw new Error('Finance reference validator block not found');
  text = text.replace(oldBlock, newBlock);
  const call = 'await validateActiveReferences(tx, input);';
  const count = text.split(call).length - 1;
  if (count !== 2) throw new Error(`Unexpected validateActiveReferences call count: ${count}`);
  text = text.replaceAll(call, 'await validateActiveReferences(tx, userId, input);');
  write(path, text);
}

// 2) Transfers reject impossible calendar days instead of Date.UTC normalization.
replaceOnce(
  'apps/api/src/modules/finance/transfer-core.ts',
  `function assertIsoDay(value: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}/.test(value)) throw new Error('INVALID_TRANSFER_DATE');
}`,
  `function assertIsoDay(value: string) {
  const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) throw new Error('INVALID_TRANSFER_DATE');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isInteger(year)
    || month < 1
    || month > 12
    || day < 1
    || parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) throw new Error('INVALID_TRANSFER_DATE');
}`,
);

{
  const path = 'apps/api/src/modules/finance/transfer-core.test.ts';
  const marker = `assert.throws(() => buildTransferLegs({
  transferId: 'transfer-004', sourceAccountId: 'a', destinationAccountId: 'b', amount: 10, date: '12/09/2026'
}), /INVALID_TRANSFER_DATE/);`;
  const addition = `${marker}

assert.throws(() => buildTransferLegs({
  transferId: 'transfer-005', sourceAccountId: 'a', destinationAccountId: 'b', amount: 10, date: '2026-02-31'
}), /INVALID_TRANSFER_DATE/);`;
  replaceOnce(path, marker, addition);
}

// 3) Public day fields use exact ISO day plus a real-calendar round-trip.
const strictDaySchema = `const isoDaySchema = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).refine((value) => {
  const parsed = new Date(\`${'${value}'}T12:00:00.000Z\`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'INVALID_DATE');`;

replaceOnce(
  'apps/api/src/modules/payables/routes.ts',
  `const isoDaySchema = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}/);`,
  strictDaySchema,
);

{
  const path = 'apps/api/src/modules/receivables/routes.ts';
  let text = read(path);
  const marker = `const operationIdSchema = z.string().trim().min(8).max(128).optional();`;
  if (!text.includes(marker)) throw new Error('Receivables schema insertion point not found');
  text = text.replace(marker, `${marker}\n${strictDaySchema}`);
  if (!text.includes(`dueDate: z.string().min(10),`)) throw new Error('Receivable dueDate schema not found');
  if (!text.includes(`receivedAt: z.string().min(10),`)) throw new Error('Receivable receivedAt schema not found');
  text = text.replace(`dueDate: z.string().min(10),`, `dueDate: isoDaySchema,`);
  text = text.replace(`receivedAt: z.string().min(10),`, `receivedAt: isoDaySchema,`);
  write(path, text);
}

replaceOnce(
  'apps/api/src/modules/cards/routes.ts',
  `purchaseDate: z.string().min(10),`,
  `purchaseDate: isoDateSchema,`,
);

// 4) Permanent E2E proof: create/update cannot use a foreign user's account.
{
  const path = 'apps/api/src/modules/finance/rc1-financial-e2e.test.ts';
  let text = read(path);
  const accountMarker = `  const effectiveDay = dayBefore(2);`;
  const accountBlock = `  const foreignUser = await prisma.user.create({
    data: {
      name: 'RC1 Foreign Catalog Owner',
      email: \`rc1-foreign-${'${suffix}'}@meg.local\`,
      passwordHash: 'not-used-in-e2e',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const foreignAccount = await prisma.account.create({
    data: {
      userId: foreignUser.id,
      name: 'Conta estrangeira RC1',
      type: 'CHECKING',
      openingBalance: 9999,
      isActive: true,
    },
  });

  await assert.rejects(
    () => createFinancialEvent(user.id, {
      description: 'RC1 tentativa de conta de outro usuário',
      type: 'expense',
      status: 'paid',
      date: \`${'${dayBefore(2)}'}T12:00:00.000Z\`,
      amount: 1,
      accountId: foreignAccount.id,
    }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_ACCOUNT',
    'Evento financeiro não pode usar conta pertencente a outro usuário.',
  );

`;
  if (!text.includes(accountMarker)) throw new Error('Financial E2E account insertion point not found');
  text = text.replace(accountMarker, accountBlock + accountMarker);

  const updateMarker = `  const updatedExpense = await updateFinancialEvent(user.id, expense.id, { amount: 250 });`;
  const updateBlock = `  await assert.rejects(
    () => updateFinancialEvent(user.id, expense.id, { accountId: foreignAccount.id }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_ACCOUNT',
    'Edição financeira não pode trocar o lançamento para conta de outro usuário.',
  );

`;
  if (!text.includes(updateMarker)) throw new Error('Financial E2E update insertion point not found');
  text = text.replace(updateMarker, updateBlock + updateMarker);
  write(path, text);
}

console.log('RC1 critical audit hardening applied.');
