import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import InventoryPage from '../features/inventory/InventoryPage';
import AccountingPage from '../features/accounting/AccountingPage';
import AdminPage from '../features/admin/AdminPage';
import HRPage from '../features/hr/HRPage';

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

describe('InventoryPage', () => {
  it('renders title and description', () => {
    render(<WithRouter><InventoryPage /></WithRouter>);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText(/Manage stock/)).toBeInTheDocument();
  });

  it('renders Add Item button', () => {
    render(<WithRouter><InventoryPage /></WithRouter>);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<WithRouter><InventoryPage /></WithRouter>);
    expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
  });
});

describe('AccountingPage', () => {
  it('renders title and loading state initially', () => {
    render(<WithRouter><AccountingPage /></WithRouter>);
    expect(screen.getByText('accounting.title')).toBeInTheDocument();
    expect(screen.getByText('accounting.loading')).toBeInTheDocument();
  });
});

describe('AdminPage', () => {
  it('renders title and description', () => {
    render(<WithRouter><AdminPage /></WithRouter>);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText(/User management/)).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    render(<WithRouter><AdminPage /></WithRouter>);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });
});

describe('HRPage', () => {
  it('renders title and description', () => {
    render(<WithRouter><HRPage /></WithRouter>);
    expect(screen.getByText('HR & Payroll')).toBeInTheDocument();
    expect(screen.getByText(/Employee management/)).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    render(<WithRouter><HRPage /></WithRouter>);
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Leaves')).toBeInTheDocument();
  });
});
