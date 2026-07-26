import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useFhirEndpoints() {
  return useQuery({
    queryKey: ['fhir-endpoints'],
    queryFn: () => api.get('/fhir/admin/endpoints'),
  });
}

export function useCreateFhirEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/fhir/admin/endpoints', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fhir-endpoints'] }),
  });
}

export function useUpdateFhirEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/fhir/admin/endpoints/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fhir-endpoints'] }),
  });
}

export function useDeleteFhirEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/fhir/admin/endpoints/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fhir-endpoints'] }),
  });
}

export function useTestFhirEndpoint() {
  return useMutation({
    mutationFn: (id) => api.post(`/fhir/admin/endpoints/${id}/test`),
  });
}

export function useFhirSearch(resourceType, params, enabled = true) {
  return useQuery({
    queryKey: ['fhir-search', resourceType, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v) searchParams.set(k, String(v));
      });
      const qs = searchParams.toString();
      return api.get(`/fhir/R4/${resourceType}${qs ? `?${qs}` : ''}`);
    },
    enabled: enabled && !!resourceType,
  });
}
