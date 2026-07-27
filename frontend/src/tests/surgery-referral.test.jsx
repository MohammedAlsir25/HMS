import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('../hooks/queries/useSurgery', () => ({
  useSurgeries: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useUpdateSurgeryStatus: vi.fn(() => ({ mutate: vi.fn() })),
  useCreateFollowUp: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSurgeryNotes: vi.fn(() => ({ data: [] })),
  useCreateSurgeryNote: vi.fn(() => ({ mutate: vi.fn() })),
  useSurgeryTeam: vi.fn(() => ({ data: [] })),
  useAddTeamMember: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveTeamMember: vi.fn(() => ({ mutate: vi.fn() })),
  useOrRoles: vi.fn(() => ({ data: [] })),
  useSurgeryEvents: vi.fn(() => ({ data: [] })),
  useAddSurgeryEvent: vi.fn(() => ({ mutate: vi.fn() })),
  useEventTypes: vi.fn(() => ({ data: [] })),
  useSurgeryFollowUpDetails: vi.fn(() => ({ data: [] })),
  useUpdateFollowUpStatus: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('../hooks/queries/useReferrals', () => ({
  useReferrals: vi.fn(() => ({ data: [], isLoading: true })),
  useUpdateReferralStatus: vi.fn(() => ({ mutate: vi.fn() })),
}));

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import SurgeryGantt from '../features/surgery/SurgeryGantt';
import ReferralsPage from '../features/referral/ReferralsPage';

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>;
}

describe('SurgeryGantt', () => {
  it('renders title and schedule header', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    expect(screen.getByText('surgery.title')).toBeInTheDocument();
    expect(screen.getByText('surgery.gantt.subtitle')).toBeInTheDocument();
  });

  it('renders OR room labels', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    expect(screen.getByText('surgery.or 1')).toBeInTheDocument();
    expect(screen.getByText('surgery.or 2')).toBeInTheDocument();
    expect(screen.getByText('surgery.or 3')).toBeInTheDocument();
  });

  it('shows date picker', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    const dateInput = screen.getByLabelText('surgery.gantt.date');
    expect(dateInput).toBeInTheDocument();
  });
});

describe('ReferralsPage', () => {
  it('renders title and description', () => {
    render(<WithRouter><ReferralsPage /></WithRouter>);
    expect(screen.getByText('referrals.title')).toBeInTheDocument();
    expect(screen.getByText('referrals.description')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<WithRouter><ReferralsPage /></WithRouter>);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});
