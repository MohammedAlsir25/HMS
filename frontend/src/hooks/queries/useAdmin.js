import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const adminKeys = {
  users: ['admin', 'users'],
  roles: ['admin', 'roles'],
  departments: ['departments'],
};

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => api.get('/admin/users'),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: adminKeys.roles,
    queryFn: () => api.get('/admin/roles'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/admin/users', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/admin/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: adminKeys.departments,
    queryFn: () => api.get('/departments'),
  });
}

// ── Pricing ──
export function useOperationTypePrices() {
  return useQuery({
    queryKey: ['admin', 'pricing', 'operation-types'],
    queryFn: () => api.get('/admin/pricing/operation-types'),
  });
}

export function useUpdateOperationTypePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }) => api.patch(`/admin/pricing/operation-types/${id}`, { price }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pricing'] }),
  });
}

export function useClinicPrices() {
  return useQuery({
    queryKey: ['admin', 'pricing', 'clinics'],
    queryFn: () => api.get('/admin/pricing/clinics'),
  });
}

export function useUpdateClinicPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, consultationFee, followUpFee }) =>
      api.patch(`/admin/pricing/clinics/${id}`, { consultationFee, followUpFee }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pricing'] }),
  });
}

export function useWardPrices() {
  return useQuery({
    queryKey: ['admin', 'pricing', 'wards'],
    queryFn: () => api.get('/admin/pricing/wards'),
  });
}

export function useUpdateWardPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dailyRate }) => api.patch(`/admin/pricing/wards/${id}`, { dailyRate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pricing'] }),
  });
}

export function useImagingProcedureTypes() {
  return useQuery({
    queryKey: ['admin', 'pricing', 'imaging-procedure-types'],
    queryFn: () => api.get('/admin/pricing/imaging-procedure-types'),
  });
}

export function useUpdateImagingProcedureTypePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }) => api.patch(`/admin/pricing/imaging-procedure-types/${id}`, { price }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pricing'] }),
  });
}
