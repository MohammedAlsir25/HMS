import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../hooks/queries/useAccounting', () => ({
  usePaymentPlans: vi.fn(),
  usePaymentPlan: vi.fn(),
  useCreatePaymentPlan: vi.fn(),
  usePayInstallment: vi.fn(),
}));

vi.mock('../hooks/usePatients', () => ({
  usePatientSearch: vi.fn(() => ({ data: [], results: [], search: vi.fn() })),
}));

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import PaymentPlanPage from '../features/accounting/PaymentPlanPage';
import {
  usePaymentPlans,
  usePaymentPlan,
  useCreatePaymentPlan,
  usePayInstallment,
} from '../hooks/queries/useAccounting';

const PLAN = { id: '1', patient: { firstName: 'Sara', lastName: 'Ali' }, totalAmount: 1200, installments: [], paidInstallments: 0, installmentCount: 6, frequency: 'MONTHLY', status: 'ACTIVE', startDate: '2026-01-01' };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PaymentPlanPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockAll(overrides = {}) {
  usePaymentPlans.mockReturnValue({ data: null, isLoading: false, isError: false, error: null, ...overrides.plans });
  usePaymentPlan.mockReturnValue({ data: null, isLoading: false, ...overrides.plan });
  useCreatePaymentPlan.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.create });
  usePayInstallment.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.pay });
}

describe('PaymentPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockAll({ plans: { data: null, isLoading: true, isError: false } });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders plan list with data', () => {
    mockAll({ plans: { data: { plans: [PLAN], totalCount: 1 } } });
    renderPage();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText(/1200/)).toBeInTheDocument();
  });

  it('shows empty state when no plans', () => {
    mockAll({ plans: { data: { plans: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByText(/no payment plans found/i)).toBeInTheDocument();
  });

  it('renders create plan button', () => {
    mockAll({ plans: { data: { plans: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByRole('button', { name: /create plan/i })).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockAll({ plans: { data: null, isLoading: false, isError: true, error: { message: 'Server error' } } });
    renderPage();
    expect(screen.getByText(/server error/i)).toBeInTheDocument();
  });
});
