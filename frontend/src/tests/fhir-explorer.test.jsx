import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../hooks/queries/useFhir', () => ({
  useFhirSearch: vi.fn(),
}));

import FhirExplorer from '../features/admin/FhirExplorer';
import { useFhirSearch } from '../hooks/queries/useFhir';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FhirExplorer />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('FhirExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resource type dropdown', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBeGreaterThan(10);
  });

  it('shows execute button', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
  });

  it('shows initial empty state message', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/execute a query/i)).toBeInTheDocument();
  });

  it('disables execute button when loading', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn() });
    renderPage();
    const btn = screen.getByRole('button', { name: /execute/i });
    expect(btn).toBeDisabled();
  });

  it('displays search results with JSON', () => {
    const mockData = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ resource: { resourceType: 'Patient', id: '123' } }],
    };
    useFhirSearch.mockReturnValue({ data: mockData, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/searchset/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Patient/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: false, isError: true, error: { message: 'Network error' }, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('changing resource type updates the URL display', () => {
    useFhirSearch.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Encounter' } });
    const urlTexts = screen.getAllByText(/encounter/i);
    expect(urlTexts.length).toBeGreaterThanOrEqual(2);
  });
});
