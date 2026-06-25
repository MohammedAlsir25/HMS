import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { clinicKeys } from './queries/useClinics';
import { useQueryClient } from '@tanstack/react-query';

export function useClinicalRecords(clinicSlug) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => api.post(`/clinics/${clinicSlug}/record`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clinicKeys.all }),
  });

  const fetchRecords = useCallback(async (patientId) => {
    if (!patientId) { setRecords([]); return; }
    setLoading(true);
    try {
      const data = await api.get(`/clinics/${clinicSlug}/records?patientId=${patientId}`);
      setRecords(data || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [clinicSlug]);

  const saveRecord = saveMutation.mutateAsync;

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get(`/clinics/${clinicSlug}/stats`);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [clinicSlug]);

  return { records, loading, saving: saveMutation.isPending, stats, fetchRecords, saveRecord, fetchStats };
}
