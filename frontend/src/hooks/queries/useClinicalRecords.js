import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { clinicKeys } from './useClinics';

export function useClinicalRecords(clinicSlug, patientId) {
  return useQuery({
    queryKey: clinicKeys.records(clinicSlug, patientId),
    queryFn: () => api.get(`/clinics/${clinicSlug}/records?patientId=${patientId}`),
    enabled: !!clinicSlug && !!patientId,
  });
}

export function useSaveClinicalRecord(clinicSlug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/clinics/${clinicSlug}/record`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}
