import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const reportKeys = {
  revenue: (params) => ['reports', 'revenue', params],
  patientVolume: (params) => ['reports', 'patients', 'volume', params],
  patientDemographics: () => ['reports', 'patients', 'demographics'],
  occupancy: (params) => ['reports', 'occupancy', params],
  pharmacy: (params) => ['reports', 'pharmacy', params],
  lab: (params) => ['reports', 'lab', params],
  surgery: (params) => ['reports', 'surgery', params],
  hr: (params) => ['reports', 'hr', params],
  dashboard: () => ['reports', 'dashboard'],
  export: (type, params) => ['reports', 'export', type, params],
};

export function useRevenueReport(params) {
  return useQuery({
    queryKey: reportKeys.revenue(params),
    queryFn: () => api.get(`/reports/revenue?${params}`),
    enabled: !!params,
  });
}

export function usePatientVolume(params) {
  return useQuery({
    queryKey: reportKeys.patientVolume(params),
    queryFn: () => api.get(`/reports/patients/volume?${params}`),
    enabled: !!params,
  });
}

export function usePatientDemographics() {
  return useQuery({
    queryKey: reportKeys.patientDemographics(),
    queryFn: () => api.get('/reports/patients/demographics'),
  });
}

export function useOccupancyReport(params) {
  return useQuery({
    queryKey: reportKeys.occupancy(params),
    queryFn: () => api.get(`/reports/occupancy?${params}`),
    enabled: !!params,
  });
}

export function usePharmacyReport(params) {
  return useQuery({
    queryKey: reportKeys.pharmacy(params),
    queryFn: () => api.get(`/reports/pharmacy?${params}`),
    enabled: !!params,
  });
}

export function useLabReport(params) {
  return useQuery({
    queryKey: reportKeys.lab(params),
    queryFn: () => api.get(`/reports/lab?${params}`),
    enabled: !!params,
  });
}

export function useSurgeryReport(params) {
  return useQuery({
    queryKey: reportKeys.surgery(params),
    queryFn: () => api.get(`/reports/surgery?${params}`),
    enabled: !!params,
  });
}

export function useHRReport(params) {
  return useQuery({
    queryKey: reportKeys.hr(params),
    queryFn: () => api.get(`/reports/hr?${params}`),
    enabled: !!params,
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => api.get('/reports/dashboard'),
  });
}

export function useExportReport(type, params) {
  return useQuery({
    queryKey: reportKeys.export(type, params),
    queryFn: () => api.get(`/reports/export?type=${type}&${params}`),
    enabled: !!type && !!params,
  });
}
