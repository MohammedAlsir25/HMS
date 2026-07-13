import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const clinicKeys = {
  all: ['clinics'],
  bySlug: (slug) => ['clinics', slug],
  queue: (slug) => ['clinics', slug, 'queue'],
  records: (slug, patientId) => ['clinics', slug, 'records', patientId],
  stats: (slug) => ['clinics', slug, 'stats'],
  medications: (slug, search) => ['clinics', slug, 'medications', search],
  screeningQueue: (slug) => ['clinics', slug, 'screening-queue'],
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

export function useScreeningQueue(slug, refetchInterval = 10000) {
  return useQuery({
    queryKey: clinicKeys.screeningQueue(slug),
    queryFn: () => api.get(`/clinics/${slug}/screening-queue`),
    enabled: !!slug,
    refetchInterval,
  });
}

export function useCompleteScreening(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/clinics/${slug}/complete-screening`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.screeningQueue(slug) });
      queryClient.invalidateQueries({ queryKey: clinicKeys.queue(slug) });
    },
  });
}

export function usePrintReport(slug) {
  return useMutation({
    mutationFn: (recordId) => api.get(`/clinics/${slug}/print-report/${recordId}`),
  });
}

export function useClinicHistory(slug, { q = '', from = '', to = '', page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['clinics', slug, 'history', { q, from, to, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return api.get(`/clinics/${slug}/history?${params.toString()}`);
    },
    enabled: !!slug,
  });
}
