import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const hrKeys = {
  employees: ['hr', 'employees'],
  employeeDetail: (id) => ['hr', 'employees', id],
  payroll: ['hr', 'payroll'],
  leaves: ['hr', 'leaves'],
  attendance: (params) => ['hr', 'attendance', params],
  dashboard: ['hr', 'dashboard'],
  shiftTemplates: ['hr', 'shift-templates'],
  roster: (date) => ['hr', 'roster', date],
  leaveBalances: (params) => ['hr', 'leave-balances', params],
  myProfile: ['hr', 'me'],
  myAttendance: (params) => ['hr', 'me', 'attendance', params],
  myLeaves: ['hr', 'me', 'leaves'],
  myPayroll: (params) => ['hr', 'me', 'payroll', params],
  myPayslip: (id) => ['hr', 'me', 'payslips', id],
  payslip: (id) => ['hr', 'payroll', id, 'payslip'],
};

export function useHREmployees() {
  return useQuery({
    queryKey: hrKeys.employees,
    queryFn: () => api.get('/hr/employees'),
  });
}

export function useHREmployeeDetail(id) {
  return useQuery({
    queryKey: hrKeys.employeeDetail(id),
    queryFn: () => api.get(`/hr/employees/${id}`),
    enabled: !!id,
  });
}

export function useHRPayroll() {
  return useQuery({
    queryKey: hrKeys.payroll,
    queryFn: () => api.get('/hr/payroll'),
  });
}

export function useHRLeaves() {
  return useQuery({
    queryKey: hrKeys.leaves,
    queryFn: () => api.get('/hr/leaves'),
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/hr/payroll/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.payroll }),
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/hr/leaves/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.leaves }),
  });
}

export function useHRAttendance(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return useQuery({
    queryKey: hrKeys.attendance(params),
    queryFn: () => api.get(`/hr/attendance${queryString ? `?${queryString}` : ''}`),
  });
}

export function useUpsertAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/attendance', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] }),
  });
}

export function useHRDashboard() {
  return useQuery({
    queryKey: hrKeys.dashboard,
    queryFn: () => api.get('/hr/dashboard'),
  });
}

export function useShiftTemplates() {
  return useQuery({
    queryKey: hrKeys.shiftTemplates,
    queryFn: () => api.get('/hr/shift-templates'),
  });
}

export function useCreateShiftTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/shift-templates', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.shiftTemplates }),
  });
}

export function useRoster(date) {
  return useQuery({
    queryKey: hrKeys.roster(date),
    queryFn: () => {
      const params = new URLSearchParams();
      if (date?.startDate) params.set('startDate', date.startDate);
      if (date?.endDate) params.set('endDate', date.endDate);
      if (date?.departmentId) params.set('departmentId', date.departmentId);
      const qs = params.toString();
      return api.get(`/hr/shifts/roster${qs ? `?${qs}` : ''}`);
    },
    enabled: !!date?.startDate && !!date?.endDate,
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/shifts/assign', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'roster'] }),
  });
}

export function useBulkAssignShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/shifts/bulk-assign', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'roster'] }),
  });
}

export function useLeaveBalances(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return useQuery({
    queryKey: hrKeys.leaveBalances(params),
    queryFn: () => api.get(`/hr/leave-balances${queryString ? `?${queryString}` : ''}`),
  });
}

export function useInitLeaveBalances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/leave-balances', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'leave-balances'] }),
  });
}

export function useBulkGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/payroll/generate', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.payroll }),
  });
}

export function usePayslip(id) {
  return useQuery({
    queryKey: hrKeys.payslip(id),
    queryFn: () => api.get(`/hr/payroll/${id}/payslip`),
    enabled: !!id,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: hrKeys.myProfile,
    queryFn: () => api.get('/hr/me'),
  });
}

export function useMyAttendance(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return useQuery({
    queryKey: hrKeys.myAttendance(params),
    queryFn: () => api.get(`/hr/me/attendance${queryString ? `?${queryString}` : ''}`),
  });
}

export function useMyLeaves() {
  return useQuery({
    queryKey: hrKeys.myLeaves,
    queryFn: () => api.get('/hr/me/leaves'),
  });
}

export function useSubmitMyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/hr/me/leaves', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hrKeys.myLeaves }),
  });
}

export function useMyPayroll(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return useQuery({
    queryKey: hrKeys.myPayroll(params),
    queryFn: () => api.get(`/hr/me/payroll${queryString ? `?${queryString}` : ''}`),
  });
}

export function useMyPayslip(id) {
  return useQuery({
    queryKey: hrKeys.myPayslip(id),
    queryFn: () => api.get(`/hr/me/payslips/${id}`),
    enabled: !!id,
  });
}
