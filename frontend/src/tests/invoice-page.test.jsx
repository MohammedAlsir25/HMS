import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../hooks/queries/useAccountingInvoices', () => ({
  useAccountingInvoices: vi.fn(),
  useAccountingInvoice: vi.fn(),
  useCreateAccountingInvoice: vi.fn(),
  useRecordInvoicePayment: vi.fn(),
}));

vi.mock('../hooks/queries/useServiceCatalog', () => ({
  useServiceItems: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../lib/printReceipt', () => ({
  printReceipt: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import InvoicePage from '../features/accounting/InvoicePage';
import {
  useAccountingInvoices,
  useAccountingInvoice,
  useCreateAccountingInvoice,
  useRecordInvoicePayment,
} from '../hooks/queries/useAccountingInvoices';

const INVOICE = { id: '1', invoiceNumber: 'INV-2026-001', patient: { firstName: 'John', lastName: 'Doe' }, total: 500, paymentStatus: 'Pending', createdAt: '2026-01-15T00:00:00Z', sourceType: 'CONSULTATION', amountPaid: 0 };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InvoicePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockAll(overrides = {}) {
  useAccountingInvoices.mockReturnValue({ data: null, isLoading: false, isError: false, error: null, ...overrides.invoices });
  useAccountingInvoice.mockReturnValue({ data: null, isLoading: false, ...overrides.invoice });
  useCreateAccountingInvoice.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.create });
  useRecordInvoicePayment.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.payment });
}

describe('InvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockAll({ invoices: { data: null, isLoading: true, isError: false } });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders invoice list table with data', () => {
    mockAll({ invoices: { data: { invoices: [INVOICE], totalCount: 1 } } });
    renderPage();
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText(/John/)).toBeInTheDocument();
    expect(screen.getByText(/Doe/)).toBeInTheDocument();
  });

  it('shows empty state when no invoices', () => {
    mockAll({ invoices: { data: { invoices: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    mockAll({ invoices: { data: { invoices: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByText(/source type/i)).toBeInTheDocument();
    expect(screen.getByText(/payment status/i)).toBeInTheDocument();
  });

  it('renders create invoice button', () => {
    mockAll({ invoices: { data: { invoices: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument();
  });

  it('opens create form modal when button clicked', () => {
    mockAll({ invoices: { data: { invoices: [], totalCount: 0 } } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create invoice/i }));
    expect(screen.getByText(/patient id/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockAll({ invoices: { data: null, isLoading: false, isError: true, error: { message: 'Failed to load' } } });
    renderPage();
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
