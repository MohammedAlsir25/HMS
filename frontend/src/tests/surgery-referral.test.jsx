import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import SurgeryGantt from '../features/surgery/SurgeryGantt';
import ReferralsPage from '../features/referral/ReferralsPage';

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>;
}

describe('SurgeryGantt', () => {
  it('renders title and schedule header', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    expect(screen.getByText('Surgery Schedule')).toBeInTheDocument();
    expect(screen.getByText('OR Gantt Chart — drag to scroll')).toBeInTheDocument();
  });

  it('renders OR room labels', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    expect(screen.getByText('OR 1')).toBeInTheDocument();
    expect(screen.getByText('OR 2')).toBeInTheDocument();
    expect(screen.getByText('OR 3')).toBeInTheDocument();
  });

  it('shows date picker', () => {
    render(<WithRouter><SurgeryGantt /></WithRouter>);
    const dateInput = screen.getByLabelText('Date');
    expect(dateInput).toBeInTheDocument();
  });
});

describe('ReferralsPage', () => {
  it('renders title and description', () => {
    render(<WithRouter><ReferralsPage /></WithRouter>);
    expect(screen.getByText('Referrals')).toBeInTheDocument();
    expect(screen.getByText('Track cross-clinic referrals and pharmacy/optics dispatches')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<WithRouter><ReferralsPage /></WithRouter>);
    expect(screen.getByText('Loading referrals...')).toBeInTheDocument();
  });
});
