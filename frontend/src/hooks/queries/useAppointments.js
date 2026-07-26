import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const appointmentKeys = {
  calendar: (params) => ['appointments', 'calendar', params],
  stats: (clinicId) => ['appointments', 'stats', clinicId],
};

export function useAppointmentsCalendar(params) {
  return useQuery({
    queryKey: appointmentKeys.calendar(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set('startDate', params.startDate);
      if (params.endDate) searchParams.set('endDate', params.endDate);
      if (params.clinicId) searchParams.set('clinicId', params.clinicId);
      if (params.doctorId) searchParams.set('doctorId', params.doctorId);
      return api.get(`/appointments/calendar?${searchParams.toString()}`);
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useAppointmentStats(clinicId) {
  return useQuery({
    queryKey: appointmentKeys.stats(clinicId),
    queryFn: () => {
      const path = clinicId
        ? `/appointments/stats?clinicId=${clinicId}`
        : '/appointments/stats';
      return api.get(path);
    },
    refetchInterval: 30000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, data }) => {
      const endpoint = type === 'WALKIN'
        ? '/reception/check-in'
        : '/reception/reservations';
      return api.post(endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] });
    },
  });
}

export function useCheckInReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/reception/reservations/${id}/check-in`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] });
    },
  });
}

export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] });
    },
  });
}
