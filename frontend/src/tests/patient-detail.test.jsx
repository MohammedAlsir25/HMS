import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../hooks/queries/usePatients', () => ({
  usePatient: vi.fn(),
  useUpdatePatient: vi.fn(),
  patientKeys: { detail: (id) => ['patient', id] },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'fake-token',
    user: { id: 'u1', role: 'Admin' },
  })),
}));

vi.mock('../utils/notify', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import PatientDetailPage from '../features/patients/PatientDetailPage';
import { usePatient, useUpdatePatient } from '../hooks/queries/usePatients';

const PATIENT = { id: 'test-id', fullName: 'Ahmed Patient', mrn: 'MRN-001', phone: '0912345678', gender: 'MALE', dateOfBirth: '1990-01-01', diabetesType: 'NONE', email: '', address: '', notes: '', nationalId: '' };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage(route = '/patients/test-id') {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/patients" element={<div>Patients Directory</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    usePatient.mockReturnValue({ data: null, isLoading: true, isError: false, error: null });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(screen.getByText(/loading patient/i)).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    usePatient.mockReturnValue({ data: null, isLoading: false, isError: true, error: { message: 'Not found' } });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(screen.getByText(/failed to load patient/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders patient header with name and MRN', () => {
    usePatient.mockReturnValue({ data: PATIENT, isLoading: false, isError: false, error: null });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Ahmed Patient' })).toBeInTheDocument();
    expect(screen.getByText(/MRN-001/)).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    usePatient.mockReturnValue({ data: PATIENT, isLoading: false, isError: false, error: null });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /appointments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clinical records/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /files/i })).toBeInTheDocument();
  });

  it('shows empty clinical records message', () => {
    usePatient.mockReturnValue({
      data: { ...PATIENT, clinicalRecords: [] },
      isLoading: false, isError: false, error: null,
    });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /clinical records/i }));
    expect(screen.getByText(/no clinical records/i)).toBeInTheDocument();
  });

  it('shows empty files message', () => {
    usePatient.mockReturnValue({
      data: { ...PATIENT, files: [] },
      isLoading: false, isError: false, error: null,
    });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /files/i }));
    expect(screen.getByText(/no files uploaded/i)).toBeInTheDocument();
  });

  it('renders back button that navigates to patient directory', () => {
    usePatient.mockReturnValue({ data: PATIENT, isLoading: false, isError: false, error: null });
    useUpdatePatient.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(screen.getByText(/back to patient directory/i)).toBeInTheDocument();
  });
});
