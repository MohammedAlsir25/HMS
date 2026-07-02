import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const clinicKeys = {
  all: ['clinics'],
  bySlug: (slug) => ['clinics', slug],
  queue: (slug) => ['clinics', slug, 'queue'],
  records: (slug, patientId) => ['clinics', slug, 'records', patientId],
  stats: (slug) => ['clinics', slug, 'stats'],
  medications: (slug, search) => ['clinics', slug, 'medications', search],
};

export function useClinics() {
  return useQuery({
    queryKey: clinicKeys.all,
    queryFn: () => api.get('/clinics'),
  });
}

export function useClinicQueue(slug, refetchInterval = 15000) {
  return useQuery({
    queryKey: clinicKeys.queue(slug),
    queryFn: () => api.get(`/clinics/${slug}/queue`),
    enabled: !!slug,
    refetchInterval,
  });
}

export function useClinicStats(slug) {
  return useQuery({
    queryKey: clinicKeys.stats(slug),
    queryFn: () => api.get(`/clinics/${slug}/stats`),
    enabled: !!slug,
  });
}

export function useClinicDoctors(slug) {
  return useQuery({
    queryKey: ['clinics', slug, 'doctors'],
    queryFn: () => api.get(`/clinics/${slug}/doctors`),
    enabled: !!slug,
  });
}
