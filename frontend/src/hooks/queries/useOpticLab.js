import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const opticLabKeys = {
  all: ['optic-lab'],
  jobs: (status) => ['optic-lab', 'jobs', status].filter(Boolean),
  job: (id) => ['optic-lab', 'job', id],
  stats: ['optic-lab', 'stats'],
};

export function useOpticLabJobs(status) {
  const params = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: opticLabKeys.jobs(status),
    queryFn: () => api.get(`/optic-lab/jobs${params}`),
  });
}

export function useOpticLabJob(id) {
  return useQuery({
    queryKey: opticLabKeys.job(id),
    queryFn: () => api.get(`/optic-lab/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateLabJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/optic-lab/jobs', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opticLabKeys.all }),
  });
}

export function useUpdateLabJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.put(`/optic-lab/jobs/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opticLabKeys.all }),
  });
}

export function useOpticLabStats() {
  return useQuery({
    queryKey: opticLabKeys.stats,
    queryFn: () => api.get('/optic-lab/stats'),
  });
}

export function useOpticLabCustomers() {
  return useQuery({
    queryKey: ['optic-lab', 'customers'],
    queryFn: () => api.get('/optic-lab/customers'),
  });
}
