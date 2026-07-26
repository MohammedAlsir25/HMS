import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import InsurancePage from '../features/insurance/InsurancePage';
import PreAuthorizationPage from '../features/insurance/PreAuthorizationPage';

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>;
}

describe('InsurancePage', () => {
  it('renders title and description', () => {
    render(<WithRouter><InsurancePage /></WithRouter>);
    expect(screen.getByText('Insurance Management')).toBeInTheDocument();
    expect(screen.getByText('Manage insurance companies and patient policy assignments')).toBeInTheDocument();
  });

  it('renders tab buttons for Companies and Policies', () => {
    render(<WithRouter><InsurancePage /></WithRouter>);
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Policies')).toBeInTheDocument();
  });

  it('shows loading state while fetching companies', () => {
    render(<WithRouter><InsurancePage /></WithRouter>);
    expect(screen.getByText(/Loading companies/i)).toBeInTheDocument();
  });
});

describe('PreAuthorizationPage', () => {
  it('renders title', () => {
    render(<WithRouter><PreAuthorizationPage /></WithRouter>);
    expect(screen.getByText('Pre-Authorizations')).toBeInTheDocument();
  });

  it('shows loading state while fetching data', () => {
    render(<WithRouter><PreAuthorizationPage /></WithRouter>);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
