import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import ReceptionPage from '../features/reception/ReceptionPage';
import WaitingRoomTV from '../features/reception/WaitingRoomTV';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

function WithRouter({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('ReceptionPage', () => {
  it('renders title description and tabs', () => {
    render(<WithRouter><ReceptionPage /></WithRouter>);
    expect(screen.getByText('reception.title')).toBeInTheDocument();
    expect(screen.getByText('reception.description')).toBeInTheDocument();
    expect(screen.getByText('reception.newPatient')).toBeInTheDocument();
    expect(screen.getByText('reception.reservations')).toBeInTheDocument();
    expect(screen.getByText('reception.queue')).toBeInTheDocument();
  });

  it('renders search area and register form on new patient tab', () => {
    render(<WithRouter><ReceptionPage /></WithRouter>);
    expect(screen.getByText('reception.search')).toBeInTheDocument();
    expect(screen.getByText('reception.registerPatient')).toBeInTheDocument();
  });
});

describe('WaitingRoomTV', () => {
  it('renders hospital name and waiting room header', () => {
    render(<WithRouter><WaitingRoomTV /></WithRouter>);
    expect(screen.getByText('AL Jawahir Hospital')).toBeInTheDocument();
    expect(screen.getByText('Waiting Room Status')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<WithRouter><WaitingRoomTV /></WithRouter>);
    expect(screen.getByText('Loading queue data...')).toBeInTheDocument();
  });

  it('shows auto-refresh indicator', () => {
    render(<WithRouter><WaitingRoomTV /></WithRouter>);
    expect(screen.getByText('Auto-refreshes every 10 seconds')).toBeInTheDocument();
  });
});
