import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const hrKeys = {
  employees: ['hr', 'employees'],
  payroll: ['hr', 'payroll'],
  leaves: ['hr', 'leaves'],
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
