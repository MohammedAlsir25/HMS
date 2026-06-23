import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useClinicalRecords(clinicSlug) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

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

  const saveRecord = useCallback(async (data) => {
    setSaving(true);
    try {
      const result = await api.post(`/clinics/${clinicSlug}/record`, data);
      return result;
    } finally {
      setSaving(false);
    }
  }, [clinicSlug]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get(`/clinics/${clinicSlug}/stats`);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [clinicSlug]);

  return { records, loading, saving, stats, fetchRecords, saveRecord, fetchStats };
}
