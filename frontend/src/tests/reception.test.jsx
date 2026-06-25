import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import ReceptionPage from '../features/reception/ReceptionPage';
import WaitingRoomTV from '../features/reception/WaitingRoomTV';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>;
}

describe('ReceptionPage', () => {
  it('renders title description and tabs', () => {
    render(<WithRouter><ReceptionPage /></WithRouter>);
    expect(screen.getByText('reception.title')).toBeInTheDocument();
    expect(screen.getByText('reception.description')).toBeInTheDocument();
    expect(screen.getByText('reception.newPatient')).toBeInTheDocument();
    expect(screen.getByText('reception.reservations')).toBeInTheDocument();
    expect(screen.getAllByText('reception.queue').length).toBeGreaterThanOrEqual(1);
  });

  it('renders search area and register form on new patient tab', () => {
    render(<WithRouter><ReceptionPage /></WithRouter>);
    fireEvent.click(screen.getByText('reception.newPatient'));
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
    expect(screen.getByText('Live · Updates every 8 seconds')).toBeInTheDocument();
  });
});
