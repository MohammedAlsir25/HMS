import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/accounts', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const groupBy = req.query.groupBy as string | undefined;
  const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
  if (groupBy === 'type') {
    const grouped: Record<string, typeof accounts> = {};
    for (const acct of accounts) {
      const group = grouped[acct.type];
      if (!group) grouped[acct.type] = [acct];
      else group.push(acct);
    }
    return res.json(grouped);
  }
  res.json(accounts);
}));

router.post('/accounts', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_ACCOUNT', 'Account'), asyncHandler(async (req, res) => {
  const { code, name, type, parentId } = req.body;
  if (!code || !name || !type) throw new ValidationError('code, name, and type are required');
  const account = await prisma.account.create({
    data: {
      code, name,
      type: type as $Enums.AccountType,
      parentId: parentId || null,
    },
  });
  res.status(201).json(account);
}));

router.patch('/accounts/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('UPDATE_ACCOUNT', 'Account'), asyncHandler(async (req, res) => {
  const { code, name, type, parentId, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (code !== undefined) data.code = code;
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (parentId !== undefined) data.parentId = parentId || null;
  if (isActive !== undefined) data.isActive = isActive;
  const account = await prisma.account.update({ where: { id: req.params.id! }, data });
  res.json(account);
}));

router.get('/journal-entries', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const accountId = req.query.accountId as string | undefined;
  const referenceType = req.query.referenceType as string | undefined;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.date = {} as Record<string, unknown>;
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.date as Record<string, unknown>).lte = end;
    }
  }
  if (referenceType) where.referenceType = referenceType;
  if (accountId) {
    where.lines = { some: { accountId } };
  }
  const [entries, totalCount] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: { lines: { include: { account: true } } },
    }),
    prisma.journalEntry.count({ where }),
  ]);
  res.json({ entries, totalCount });
}));

router.post('/journal-entries', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_JOURNAL_ENTRY', 'JournalEntry'), asyncHandler(async (req, res) => {
  const { date, description, referenceType, referenceId, lines } = req.body;
  if (!date || !description || !lines || !Array.isArray(lines) || lines.length < 2) {
    throw new ValidationError('date, description, and at least 2 lines are required');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += parseFloat(line.debit) || 0;
    totalCredit += parseFloat(line.credit) || 0;
  }
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new ValidationError('Total debits must equal total credits');
  }

  const year = new Date().getFullYear();
  const countResult = await prisma.$queryRawUnsafe<{ max_seq: number | null }[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as max_seq FROM journal_entries WHERE entry_number LIKE $1`,
    `JE-${year}-%`,
  );
  const seq = Number(countResult[0]?.max_seq ?? 1);
  const entryNumber = `JE-${year}-${String(seq).padStart(5, '0')}`;

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(date),
      description,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      created_by: req.user!.id,
      lines: {
        createMany: {
          data: lines.map((line: Record<string, unknown>) => ({
            accountId: line.accountId as string,
            debit: parseFloat(line.debit as string) || 0,
            credit: parseFloat(line.credit as string) || 0,
          })),
        },
      },
    },
    include: { lines: { include: { account: true } } },
  });
  res.status(201).json(entry);
}));

router.get('/journal-entries/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: req.params.id! },
    include: { lines: { include: { account: true } } },
  });
  if (!entry) throw new NotFoundError('Journal entry not found');
  res.json(entry);
}));

router.post('/journal-entries/reverse', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('REVERSE_JOURNAL_ENTRY', 'JournalEntry'), asyncHandler(async (req, res) => {
  const { entryId } = req.body;
  if (!entryId) throw new ValidationError('entryId is required');

  const original = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });
  if (!original) throw new NotFoundError('Journal entry not found');

  const year = new Date().getFullYear();
  const countResult = await prisma.$queryRawUnsafe<{ max_seq: number | null }[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as max_seq FROM journal_entries WHERE entry_number LIKE $1`,
    `JE-${year}-%`,
  );
  const seq = Number(countResult[0]?.max_seq ?? 1);
  const entryNumber = `JE-${year}-${String(seq).padStart(5, '0')}`;

  const reversal = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(),
      description: `(Reversal) ${original.description}`,
      referenceType: 'REVERSAL',
      referenceId: original.id,
      created_by: req.user!.id,
      lines: {
        createMany: {
          data: original.lines.map(line => ({
            accountId: line.accountId,
            debit: Number(line.credit),
            credit: Number(line.debit),
          })),
        },
      },
    },
    include: { lines: { include: { account: true } } },
  });
  res.status(201).json(reversal);
}));

export default router;
