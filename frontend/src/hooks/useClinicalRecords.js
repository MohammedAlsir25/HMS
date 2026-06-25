import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { clinicKeys } from './queries/useClinics';

export function useClinicalRecords(clinicSlug) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: [...clinicKeys.all, 'records', clinicSlug, 'stats'],
    queryFn: () => api.get(`/clinics/${clinicSlug}/stats`),
  });

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

  return { records, loading, saving: saveMutation.isPending, stats, fetchRecords: fetchRecords, saveRecord, fetchStats: () => {} };
}
