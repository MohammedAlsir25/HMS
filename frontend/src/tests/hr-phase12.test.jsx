import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('../hooks/queries/useHR', () => ({
  useHREmployeeDetail: vi.fn(),
  useHRAttendance: vi.fn(),
  useHRLeaves: vi.fn(),
  useHRPayroll: vi.fn(),
  hrKeys: { employeeDetail: (id) => ['hr', 'employees', id], employees: ['hr', 'employees'] },
  useMyProfile: vi.fn(),
  useMyAttendance: vi.fn(),
  useMyLeaves: vi.fn(),
  useMyPayroll: vi.fn(),
  useSubmitMyLeave: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../hooks/queries/useAdmin', () => ({
  useDepartments: vi.fn(() => ({ data: [] })),
  useAdminRoles: vi.fn(() => ({ data: [] })),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

import EmployeeDetail from '../features/hr/EmployeeDetail';
import MyHRPage from '../features/hr/MyHRPage';
import { useHREmployeeDetail, useHRAttendance, useHRLeaves, useHRPayroll, useMyProfile, useMyAttendance, useMyLeaves, useMyPayroll } from '../hooks/queries/useHR';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EmployeeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    useHREmployeeDetail.mockReturnValue({ data: null, isLoading: true, error: null });
    useHRAttendance.mockReturnValue({ data: [], isLoading: false });
    useHRLeaves.mockReturnValue({ data: [], isLoading: false });
    useHRPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<EmployeeDetail />, { route: '/hr/employees/test-id' });
    expect(screen.getByText(/loading employee/i)).toBeInTheDocument();
  });

  it('shows error state when employee not found', () => {
    useHREmployeeDetail.mockReturnValue({ data: null, isLoading: false, error: { message: 'Employee not found' } });
    useHRAttendance.mockReturnValue({ data: [], isLoading: false });
    useHRLeaves.mockReturnValue({ data: [], isLoading: false });
    useHRPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<EmployeeDetail />, { route: '/hr/employees/test-id' });
    expect(screen.getByText(/employee not found/i)).toBeInTheDocument();
    expect(screen.getByText(/back to hr/i)).toBeInTheDocument();
  });

  it('renders employee profile with all tabs', () => {
    useHREmployeeDetail.mockReturnValue({
      data: { id: '1', fullName: 'Ahmed Ali', employeeCode: 'EMP001', position: 'Doctor', department: 'Cardiology', baseSalary: 5000, hireDate: '2024-01-15', isActive: true, phone: '123', email: 'ahmed@test.com', gender: 'MALE', dept: { name: 'Cardiology' }, user: { email: 'ahmed@hms.com', role: { name: 'Doctor' } }, emergencyContact: { name: 'Sara', phone: '456', relationship: 'Wife' }, documents: [] },
      isLoading: false,
      error: null,
    });
    useHRAttendance.mockReturnValue({ data: [], isLoading: false });
    useHRLeaves.mockReturnValue({ data: [], isLoading: false });
    useHRPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<EmployeeDetail />, { route: '/hr/employees/1' });
    expect(screen.getAllByText('Ahmed Ali').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Leaves')).toBeInTheDocument();
    expect(screen.getByText('Payslips')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('shows emergency contact info', () => {
    useHREmployeeDetail.mockReturnValue({
      data: { id: '1', fullName: 'Test User', employeeCode: 'E001', position: 'Nurse', department: 'ER', baseSalary: 3000, hireDate: '2024-06-01', isActive: true, dept: { name: 'ER' }, user: null, emergencyContact: { name: 'John', phone: '999', relationship: 'Father' }, documents: null },
      isLoading: false,
      error: null,
    });
    useHRAttendance.mockReturnValue({ data: [], isLoading: false });
    useHRLeaves.mockReturnValue({ data: [], isLoading: false });
    useHRPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<EmployeeDetail />, { route: '/hr/employees/1' });
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('shows empty attendance tab', () => {
    useHREmployeeDetail.mockReturnValue({
      data: { id: '1', fullName: 'Test', employeeCode: 'E001', position: 'Nurse', department: 'ER', baseSalary: 3000, hireDate: '2024-06-01', isActive: true, dept: { name: 'ER' }, user: null, emergencyContact: null, documents: null },
      isLoading: false,
      error: null,
    });
    useHRAttendance.mockReturnValue({ data: [], isLoading: false });
    useHRLeaves.mockReturnValue({ data: [], isLoading: false });
    useHRPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<EmployeeDetail />, { route: '/hr/employees/1' });
    fireEvent.click(screen.getByText('Attendance'));
    expect(screen.getByText('Attendance History')).toBeInTheDocument();
  });
});

describe('MyHRPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    useMyProfile.mockReturnValue({ data: null, isLoading: true, error: null });
    useMyAttendance.mockReturnValue({ data: [], isLoading: false });
    useMyLeaves.mockReturnValue({ data: [], isLoading: false });
    useMyPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MyHRPage />);
    expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
  });

  it('shows error when no employee profile linked', () => {
    useMyProfile.mockReturnValue({ data: null, isLoading: false, error: { message: 'No employee profile linked to your account' } });
    useMyAttendance.mockReturnValue({ data: [], isLoading: false });
    useMyLeaves.mockReturnValue({ data: [], isLoading: false });
    useMyPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MyHRPage />);
    expect(screen.getByText(/no employee profile linked/i)).toBeInTheDocument();
  });

  it('renders self-service portal with tabs', () => {
    useMyProfile.mockReturnValue({
      data: { id: '1', fullName: 'Nour Hassan', employeeCode: 'EMP002', position: 'Nurse', department: 'Pediatrics', baseSalary: 4000, hireDate: '2024-03-01', phone: '777', email: 'nour@test.com', gender: 'FEMALE', dept: { name: 'Pediatrics' }, emergencyContact: null },
      isLoading: false,
      error: null,
    });
    useMyAttendance.mockReturnValue({ data: [], isLoading: false });
    useMyLeaves.mockReturnValue({ data: [], isLoading: false });
    useMyPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MyHRPage />);
    expect(screen.getByText('My HR Portal')).toBeInTheDocument();
    expect(screen.getAllByText('My Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('My Attendance')).toBeInTheDocument();
    expect(screen.getByText('My Leaves')).toBeInTheDocument();
    expect(screen.getByText('My Payslips')).toBeInTheDocument();
  });

  it('displays profile personal info', () => {
    useMyProfile.mockReturnValue({
      data: { id: '1', fullName: 'Nour Hassan', employeeCode: 'EMP002', position: 'Nurse', department: 'Pediatrics', baseSalary: 4000, hireDate: '2024-03-01', phone: '777', email: 'nour@test.com', gender: 'FEMALE', dept: { name: 'Pediatrics' }, emergencyContact: { name: 'Ali', phone: '888', relationship: 'Brother' } },
      isLoading: false,
      error: null,
    });
    useMyAttendance.mockReturnValue({ data: [], isLoading: false });
    useMyLeaves.mockReturnValue({ data: [], isLoading: false });
    useMyPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MyHRPage />);
    expect(screen.getByText('Nour Hassan')).toBeInTheDocument();
    expect(screen.getByText('EMP002')).toBeInTheDocument();
    expect(screen.getByText('Ali')).toBeInTheDocument();
  });

  it('shows empty attendance for period', () => {
    useMyProfile.mockReturnValue({
      data: { id: '1', fullName: 'Test', employeeCode: 'E001', position: 'Nurse', department: 'ER', baseSalary: 3000, hireDate: '2024-06-01', dept: { name: 'ER' }, emergencyContact: null },
      isLoading: false,
      error: null,
    });
    useMyAttendance.mockReturnValue({ data: [], isLoading: false });
    useMyLeaves.mockReturnValue({ data: [], isLoading: false });
    useMyPayroll.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MyHRPage />);
    expect(screen.getByText('My Attendance')).toBeInTheDocument();
  });
});
