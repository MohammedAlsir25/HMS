import prisma from '../../../lib/prisma.js';

const TRANSACTION_TYPE_TO_ACCOUNT: Record<string, string> = {
  RECEPTION: '4100',
  PHARMACY: '4500',
  LAB: '4300',
  IMAGING: '4400',
  SURGERY: '4200',
  WARD: '4600',
  OPTICS: '4900',
  PREOP: '4900',
};

const EXPENSE_CATEGORY_TO_ACCOUNT: Record<string, string> = {
  SALARY: '5100',
  SUPPLIES: '5200',
  UTILITIES: '5300',
  RENT: '5400',
  EQUIPMENT: '5500',
  MAINTENANCE: '5600',
  MARKETING: '5700',
  OTHER: '5900',
};

async function generateEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await prisma.$queryRawUnsafe<{ max_seq: number | null }[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as max_seq FROM journal_entries WHERE entry_number LIKE $1`,
    `JE-${year}-%`,
  );
  const seq = Number(countResult[0]?.max_seq ?? 1);
  return `JE-${year}-${String(seq).padStart(5, '0')}`;
}

export async function createJournalFromTransaction(
  tx: { id: string; type: string; amount: number | string; paymentMethod: string; createdAt: Date; hospitalId?: string | null },
) {
  const debitAccountCode = tx.paymentMethod === 'CASH' ? '1100' : '1200';
  const revenueAccountCode = TRANSACTION_TYPE_TO_ACCOUNT[tx.type] || '4900';

  const debitAccount = await prisma.account.findFirst({ where: { code: debitAccountCode } });
  const creditAccount = await prisma.account.findFirst({ where: { code: revenueAccountCode } });
  if (!debitAccount || !creditAccount) return;

  const entryNumber = await generateEntryNumber();
  await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: tx.createdAt,
      description: `Auto: ${tx.type} transaction ${tx.id}`,
      referenceType: 'TRANSACTION',
      referenceId: tx.id,
      created_by: null,
      lines: {
        createMany: {
          data: [
            { accountId: debitAccount.id, debit: parseFloat(String(tx.amount)), credit: 0 },
            { accountId: creditAccount.id, debit: 0, credit: parseFloat(String(tx.amount)) },
          ],
        },
      },
    },
  });
}

export async function createJournalFromExpense(
  expense: { id: string; amount: number | string; category: string; paymentMethod: string | null; date: Date; hospitalId?: string | null },
) {
  const expenseAccountCode = EXPENSE_CATEGORY_TO_ACCOUNT[expense.category] || '5900';
  const creditAccountCode = expense.paymentMethod === 'CASH' ? '1100' : '1200';

  const debitAccount = await prisma.account.findFirst({ where: { code: expenseAccountCode } });
  const creditAccount = await prisma.account.findFirst({ where: { code: creditAccountCode } });
  if (!debitAccount || !creditAccount) return;

  const entryNumber = await generateEntryNumber();
  await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: expense.date,
      description: `Auto: Expense - ${expense.category} ${expense.id}`,
      referenceType: 'EXPENSE',
      referenceId: expense.id,
      created_by: null,
      lines: {
        createMany: {
          data: [
            { accountId: debitAccount.id, debit: parseFloat(String(expense.amount)), credit: 0 },
            { accountId: creditAccount.id, debit: 0, credit: parseFloat(String(expense.amount)) },
          ],
        },
      },
    },
  });
}
