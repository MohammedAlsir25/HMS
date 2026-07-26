import type { Request } from 'express';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

export function getDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate
    ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function hospitalScope(req: Request): { hospitalId: string } {
  return { hospitalId: req.user!.hospitalId! };
}

export function buildDateWhere(
  req: Request,
  dateField: string = 'createdAt',
): Record<string, unknown> {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;
  const { start, end } = getDateRange(startDate, endDate);
  const where: Record<string, unknown> = { hospitalId };
  where[dateField] = { gte: start, lte: end };
  return where;
}
