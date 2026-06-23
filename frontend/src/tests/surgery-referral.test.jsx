import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import SurgeryGantt from '../features/surgery/SurgeryGantt';
import ReferralsPage from '../features/referral/ReferralsPage';

function WithRouter({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>;
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
