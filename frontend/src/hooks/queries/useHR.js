import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const hrKeys = {
  employees: ['hr', 'employees'],
  payroll: ['hr', 'payroll'],
  leaves: ['hr', 'leaves'],
  attendance: (params) => ['hr', 'attendance', params],
};

export function useHREmployees() {
  return useQuery({
    queryKey: hrKeys.employees,
    queryFn: () => api.get('/hr/employees'),
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
