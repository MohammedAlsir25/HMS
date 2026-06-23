import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL = 15000;

export function useClinicQueue(clinicSlug, onSelectPatient) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timer = useRef(null);

  const fetchQueue = useCallback(async () => {
    if (!clinicSlug) return;
    try {
      const data = await api.get(`/clinics/${clinicSlug}/queue`);
      setQueue(data || []);
      setLastUpdated(new Date());
    } catch {
      if (queue.length === 0) setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [clinicSlug]);

  useEffect(() => {
    fetchQueue();
    timer.current = setInterval(fetchQueue, POLL_INTERVAL);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchQueue]);

  const startConsultation = useCallback(async (appointment) => {
    try {
      await api.patch(`/reception/appointments/${appointment.id}/status`, { status: 'IN_PROGRESS' });
    } catch {
      // if status update fails, still proceed with consultation
    }
    onSelectPatient?.(appointment.patient);
    setQueue((prev) => prev.filter((a) => a.id !== appointment.id));
  }, [onSelectPatient]);

  return { queue, loading, lastUpdated, startConsultation, refresh: fetchQueue };
}
