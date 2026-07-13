import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const patientKeys = {
  all: ['patients'],
  list: (params) => ['patients', 'list', params],
  detail: (id) => ['patients', id],
};

export function usePatientList(params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => api.get(`/patients${queryString ? `?${queryString}` : ''}`),
    placeholderData: (prev) => prev,
  });
}

export function usePatient(id) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => api.get(`/patients/${id}`),
    enabled: !!id,
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/patients/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}