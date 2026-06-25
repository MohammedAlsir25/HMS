import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { clinicKeys } from './queries/useClinics';

export function useClinicQueue(clinicSlug, onSelectPatient) {
  const queryClient = useQueryClient();

  const { data: queue = [], isLoading: loading, dataUpdatedAt } = useQuery({
    queryKey: clinicKeys.queue(clinicSlug),
    queryFn: () => api.get(`/clinics/${clinicSlug}/queue`),
    enabled: !!clinicSlug,
    refetchInterval: 15000,
  });

  const startConsultation = useCallback(async (appointment) => {
    try {
      await api.patch(`/reception/appointments/${appointment.id}/status`, { status: 'IN_PROGRESS' });
    } catch {
      // if status update fails, still proceed with consultation
    }
    onSelectPatient?.(appointment.patient);
    queryClient.setQueryData(clinicKeys.queue(clinicSlug), (prev) =>
      (prev || []).filter((a) => a.id !== appointment.id)
    );
  }, [onSelectPatient, queryClient, clinicSlug]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clinicKeys.queue(clinicSlug) });
  }, [queryClient, clinicSlug]);

  return { queue, loading, lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null, startConsultation, refresh };
}
