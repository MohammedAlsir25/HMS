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

vi.mock('../hooks/queries/useInsurance', () => ({
  useDenialAppeals: vi.fn(),
  useCreateDenialAppeal: vi.fn(),
  useUpdateDenialAppeal: vi.fn(),
  useResubmitDenialAppeal: vi.fn(),
  useInsuranceClaims: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import DenialAppealPage from '../features/insurance/DenialAppealPage';
import {
  useDenialAppeals,
  useCreateDenialAppeal,
  useResubmitDenialAppeal,
  useInsuranceClaims,
} from '../hooks/queries/useInsurance';

const APPEAL = { id: '1', appealNumber: 'APL-2026-00001', status: 'OPEN', claim: { claimNumber: 'CLM-001', claimAmount: 500, patient: { firstName: 'Test', lastName: 'Patient' }, insuranceCompany: { name: 'InsCo' } }, createdAt: '2026-01-15T00:00:00Z' };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DenialAppealPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockAll(overrides = {}) {
  useDenialAppeals.mockReturnValue({ data: null, isLoading: false, isError: false, error: null, ...overrides.appeals });
  useCreateDenialAppeal.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.create });
  useResubmitDenialAppeal.mockReturnValue({ mutate: vi.fn(), isPending: false, ...overrides.resubmit });
  useInsuranceClaims.mockReturnValue({ data: [], isLoading: false, ...overrides.claims });
}

describe('DenialAppealPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockAll({ appeals: { data: null, isLoading: true, isError: false } });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders appeal list with data', () => {
    mockAll({ appeals: { data: { appeals: [APPEAL] } } });
    renderPage();
    expect(screen.getByText(/CLM-001/)).toBeInTheDocument();
    expect(screen.getByText(/Test/)).toBeInTheDocument();
    expect(screen.getByText(/Patient/)).toBeInTheDocument();
  });

  it('shows empty state when no appeals', () => {
    mockAll({ appeals: { data: { appeals: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByText(/no denial appeals found/i)).toBeInTheDocument();
  });

  it('renders status filter buttons', () => {
    mockAll({ appeals: { data: { appeals: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /in review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approved/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /denied/i })).toBeInTheDocument();
  });

  it('renders create appeal button', () => {
    mockAll({ appeals: { data: { appeals: [], totalCount: 0 } } });
    renderPage();
    expect(screen.getByRole('button', { name: /create appeal/i })).toBeInTheDocument();
  });

  it('opens create form when button clicked', () => {
    mockAll({
      appeals: { data: { appeals: [], totalCount: 0 } },
      claims: { data: [{ id: 'c1', claimNumber: 'CLM-001', claimAmount: 500, patient: { fullName: 'Test' } }] },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create appeal/i }));
    expect(screen.getByText(/denial reason/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockAll({ appeals: { data: null, isLoading: false, isError: true, error: { message: 'Failed' } } });
    renderPage();
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});
