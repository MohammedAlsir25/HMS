import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTemplate(html: string, data: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  return result;
}

function renderEachBlock(html: string, blockName: string, items: Record<string, string>[]): string {
  const startToken = `{{#each ${blockName}}}`;
  const endToken = `{{/each}}`;
  const startIdx = html.indexOf(startToken);
  const endIdx = html.indexOf(endToken);
  if (startIdx === -1 || endIdx === -1) return html;

  const rowTemplate = html.substring(startIdx + startToken.length, endIdx);
  const rendered = items.map((item) => {
    let row = rowTemplate;
    for (const [key, value] of Object.entries(item)) {
      row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), value ?? '');
    }
    return row;
  }).join('');

  return html.substring(0, startIdx) + rendered + html.substring(endIdx + endToken.length);
}

function renderIfBlock(html: string, varName: string, show: boolean): string {
  const ifStart = `{{#if ${varName}}}`;
  const ifEnd = `{{/if}}`;
  let result = html;
  let searchFrom = 0;
  while (true) {
    const startIdx = result.indexOf(ifStart, searchFrom);
    if (startIdx === -1) break;
    const endIdx = result.indexOf(ifEnd, startIdx + ifStart.length);
    if (endIdx === -1) break;
    const blockContent = result.substring(startIdx + ifStart.length, endIdx);
    const replacement = show ? blockContent : '';
    result = result.substring(0, startIdx) + replacement + result.substring(endIdx + ifEnd.length);
    searchFrom = startIdx + replacement.length;
  }
  return result;
}

function loadTemplate(name: string): string {
  return readFileSync(join(__dirname, `../templates/${name}.html`), 'utf-8');
}

function formatCurrencyValue(amount: number, currency = 'SDG'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    SAR: '\uFEFF',
    AED: 'د.إ',
    EGP: 'E£',
    SDG: 'SDG',
  };
  const sym = symbols[currency] ?? currency;
  return `${sym} ${Number(amount).toFixed(2)}`;
}

export interface InvoiceItemData {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

export interface InvoiceData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  patientNameAr: string;
  patientNameEn: string;
  patientMrn: string;
  items: InvoiceItemData[];
  subtotal: number;
  discount?: number;
  tax?: number;
  insuranceCoverage?: number;
  patientResponsibility?: number;
  total: number;
  currency?: string;
}

export function renderArabicInvoice(data: InvoiceData): string {
  const html = loadTemplate('arabicInvoice');
  const currency = data.currency || 'SDG';
  const discount = Number(data.discount) || 0;
  const tax = Number(data.tax) || 0;
  const insuranceCoverage = Number(data.insuranceCoverage) || 0;
  const patientResponsibility = data.patientResponsibility != null
    ? Number(data.patientResponsibility)
    : Number(data.total) - insuranceCoverage;

  const items = data.items.map((item, idx) => ({
    index1: String(idx + 1),
    description: escapeHtml(String(item.description)),
    quantity: String(item.quantity),
    unitPriceFormatted: formatCurrencyValue(Number(item.unitPrice), currency),
    totalFormatted: formatCurrencyValue(Number(item.total), currency),
  }));

  let rendered = renderTemplate(html, {
    hospitalName: escapeHtml(data.hospitalName),
    hospitalAddress: escapeHtml(data.hospitalAddress),
    hospitalPhone: escapeHtml(data.hospitalPhone || ''),
    invoiceNumber: escapeHtml(data.invoiceNumber),
    invoiceDate: escapeHtml(data.invoiceDate),
    dueDate: escapeHtml(data.dueDate),
    patientNameAr: escapeHtml(data.patientNameAr),
    patientNameEn: escapeHtml(data.patientNameEn),
    patientMrn: escapeHtml(data.patientMrn),
    subtotalFormatted: formatCurrencyValue(data.subtotal, currency),
    discountFormatted: formatCurrencyValue(discount, currency),
    discountAmount: String(discount),
    taxFormatted: formatCurrencyValue(tax, currency),
    taxAmount: String(tax),
    insuranceCoverageFormatted: formatCurrencyValue(insuranceCoverage, currency),
    insuranceCoverage: String(insuranceCoverage),
    patientResponsibilityFormatted: formatCurrencyValue(patientResponsibility, currency),
    totalFormatted: formatCurrencyValue(data.total, currency),
  });

  rendered = renderEachBlock(rendered, 'items', items);
  rendered = renderIfBlock(rendered, 'discountAmount', discount > 0);
  rendered = renderIfBlock(rendered, 'taxAmount', tax > 0);
  rendered = renderIfBlock(rendered, 'insuranceCoverage', insuranceCoverage > 0);

  return rendered;
}

export interface ReceiptData {
  hospitalName: string;
  hospitalAddress: string;
  receiptNumber: string;
  receiptDate: string;
  receiptTime: string;
  patientName: string;
  patientMrn: string;
  invoiceNumber: string;
  paymentMethod: string;
  amountPaid: number;
  remainingBalance?: number;
  currency?: string;
}

export function renderArabicReceipt(data: ReceiptData): string {
  const html = loadTemplate('arabicReceipt');
  const currency = data.currency || 'SDG';
  const barcodeNumber = data.receiptNumber.replace(/[^a-zA-Z0-9]/g, '');

  const methodLabels: Record<string, string> = {
    CASH: 'نقدي',
    CARD: 'بطاقة',
    CREDIT: 'آجل',
    INSURANCE: 'تأمين',
    BANK_TRANSFER: 'تحويل بنكي',
    CHECK: 'شيك',
  };

  let rendered = renderTemplate(html, {
    hospitalName: escapeHtml(data.hospitalName),
    hospitalAddress: escapeHtml(data.hospitalAddress),
    receiptNumber: escapeHtml(data.receiptNumber),
    receiptDate: escapeHtml(data.receiptDate),
    receiptTime: escapeHtml(data.receiptTime),
    patientName: escapeHtml(data.patientName),
    patientMrn: escapeHtml(data.patientMrn),
    invoiceNumber: escapeHtml(data.invoiceNumber),
    paymentMethod: methodLabels[data.paymentMethod] || escapeHtml(data.paymentMethod),
    amountPaidFormatted: formatCurrencyValue(data.amountPaid, currency),
    amountInWords: '',
    barcodeNumber: escapeHtml(barcodeNumber),
  });

  rendered = renderIfBlock(rendered, 'remainingBalance', !!data.remainingBalance && data.remainingBalance > 0);
  if (data.remainingBalance && data.remainingBalance > 0) {
    rendered = rendered.replace('{{remainingBalanceFormatted}}', formatCurrencyValue(data.remainingBalance, currency));
  }

  return rendered;
}

export interface StatementTransaction {
  date: string;
  description: string;
  invoiceNumber: string;
  status: string;
  statusClass: string;
  statusLabel: string;
  amount: number;
  paid: number;
  balance: number;
}

export interface StatementData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  patientName: string;
  patientMrn: string;
  periodFrom: string;
  periodTo: string;
  generatedDate: string;
  transactions: StatementTransaction[];
  totalInvoiced: number;
  totalPaid: number;
  insuranceCovered: number;
  creditMemos: number;
  outstandingBalance: number;
}

export function renderPatientStatement(data: StatementData): string {
  const html = loadTemplate('patientStatement');

  const transactions = data.transactions.map((tx) => ({
    date: escapeHtml(tx.date),
    description: escapeHtml(tx.description),
    invoiceNumber: escapeHtml(tx.invoiceNumber),
    statusClass: tx.statusClass,
    statusLabel: escapeHtml(tx.statusLabel),
    amountFormatted: formatCurrencyValue(tx.amount),
    paidFormatted: formatCurrencyValue(tx.paid),
    balanceClass: tx.balance > 0 ? 'debit' : 'credit',
    balanceFormatted: formatCurrencyValue(tx.balance),
  }));

  let rendered = renderTemplate(html, {
    hospitalName: escapeHtml(data.hospitalName),
    hospitalAddress: escapeHtml(data.hospitalAddress),
    hospitalPhone: escapeHtml(data.hospitalPhone || ''),
    patientName: escapeHtml(data.patientName),
    patientMrn: escapeHtml(data.patientMrn),
    periodFrom: escapeHtml(data.periodFrom),
    periodTo: escapeHtml(data.periodTo),
    generatedDate: escapeHtml(data.generatedDate),
    totalInvoicedFormatted: formatCurrencyValue(data.totalInvoiced),
    totalPaidFormatted: formatCurrencyValue(data.totalPaid),
    insuranceCoveredFormatted: formatCurrencyValue(data.insuranceCovered),
    creditMemosFormatted: formatCurrencyValue(data.creditMemos),
    outstandingBalanceFormatted: formatCurrencyValue(data.outstandingBalance),
  });

  rendered = renderEachBlock(rendered, 'transactions', transactions);

  return rendered;
}
