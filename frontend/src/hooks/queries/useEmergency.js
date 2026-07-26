import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const emergencyKeys = {
  all: ['emergency'],
  dashboard: ['emergency', 'dashboard'],
  triage: {
    active: ['emergency', 'triage', 'active'],
    history: (params) => ['emergency', 'triage', 'history', params],
    single: (id) => ['emergency', 'triage', id],
  },
  consultationQueue: ['emergency', 'consultation-queue'],
  stats: (params) => ['emergency', 'stats', params],
  dailyTrend: (params) => ['emergency', 'stats', 'daily-trend', params],
};

export function useEmergencyDashboard() {
  return useQuery({
    queryKey: emergencyKeys.dashboard,
    queryFn: () => api.get('/emergency/dashboard'),
    refetchInterval: 30000,
  });
}

export function useActiveTriages() {
  return useQuery({
    queryKey: emergencyKeys.triage.active,
    queryFn: () => api.get('/emergency/triage/active'),
    refetchInterval: 15000,
  });
}

export function useTriageHistory(params) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: emergencyKeys.triage.history(params),
    queryFn: () => api.get(`/emergency/triage/history${qs ? `?${qs}` : ''}`),
  });
}

export function useTriage(id) {
  return useQuery({
    queryKey: emergencyKeys.triage.single(id),
    queryFn: () => api.get(`/emergency/triage/${id}`),
    enabled: !!id,
  });
}

export function useCreateTriage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/emergency/triage', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useUpdateTriage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/emergency/triage/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useRapidRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/emergency/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: emergencyKeys.triage.active });
    },
  });
}

export function useEmergencyAdmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/emergency/admit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useEmergencyRefer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/emergency/refer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emergencyKeys.all });
    },
  });
}

export function useConsultationQueue() {
  return useQuery({
    queryKey: emergencyKeys.consultationQueue,
    queryFn: () => api.get('/emergency/consultation-queue'),
    refetchInterval: 15000,
  });
}

export function useEmergencyStats(params) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: emergencyKeys.stats(params),
    queryFn: () => api.get(`/emergency/stats/overview${qs ? `?${qs}` : ''}`),
  });
}

export function useDailyTrend(params) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: emergencyKeys.dailyTrend(params),
    queryFn: () => api.get(`/emergency/stats/daily-trend${qs ? `?${qs}` : ''}`),
  });
}
