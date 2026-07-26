import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const insuranceKeys = {
  companies: (params) => ['insurance', 'companies', params],
  company: (id) => ['insurance', 'company', id],
  policies: (params) => ['insurance', 'policies', params],
  patientPolicies: (patientId) => ['insurance', 'patient-policies', patientId],
  pricingRules: (params) => ['insurance', 'pricing-rules', params],
  preAuthorizations: (params) => ['insurance', 'pre-authorizations', params],
  preAuthorization: (id) => ['insurance', 'pre-authorization', id],
  claims: (params) => ['insurance', 'claims', params],
  claim: (id) => ['insurance', 'claim', id],
  claimDashboard: ['insurance', 'claims', 'dashboard'],
  pendingReviews: ['insurance', 'claims', 'pending-reviews'],
  settlements: (params) => ['insurance', 'settlements', params],
  reports: (type, params) => ['insurance', 'reports', type, params],
  checkoutPreview: (params) => ['insurance', 'checkout-preview', params],
};

export function useInsuranceCompanies(params) {
  return useQuery({
    queryKey: insuranceKeys.companies(params),
    queryFn: () => api.get(`/insurance/companies?${params}`),
    enabled: !!params,
  });
}

export function useInsuranceCompany(id) {
  return useQuery({
    queryKey: insuranceKeys.company(id),
    queryFn: () => api.get(`/insurance/companies/${id}`),
    enabled: !!id,
  });
}

export function useCreateInsuranceCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/companies', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'companies'] }),
  });
}

export function useUpdateInsuranceCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/companies/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'companies'] }),
  });
}

export function useDeleteInsuranceCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/insurance/companies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'companies'] }),
  });
}

export function useInsurancePolicies(params) {
  return useQuery({
    queryKey: insuranceKeys.policies(params),
    queryFn: () => api.get(`/insurance/policies?${params}`),
    enabled: !!params,
  });
}

export function useCreateInsurancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/policies', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'policies'] }),
  });
}

export function useUpdateInsurancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/policies/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'policies'] }),
  });
}

export function usePatientPolicies(patientId) {
  return useQuery({
    queryKey: insuranceKeys.patientPolicies(patientId),
    queryFn: () => api.get(`/insurance/patients/${patientId}/policies`),
    enabled: !!patientId,
  });
}

export function useInsurancePricingRules(params) {
  return useQuery({
    queryKey: insuranceKeys.pricingRules(params),
    queryFn: () => api.get(`/insurance/pricing-rules?${params}`),
    enabled: !!params,
  });
}

export function useCreateInsurancePricingRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/pricing-rules', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'pricing-rules'] }),
  });
}

export function usePreAuthorizations(params) {
  return useQuery({
    queryKey: insuranceKeys.preAuthorizations(params),
    queryFn: () => api.get(`/insurance/pre-authorizations?${params}`),
    enabled: !!params,
  });
}

export function usePreAuthorization(id) {
  return useQuery({
    queryKey: insuranceKeys.preAuthorization(id),
    queryFn: () => api.get(`/insurance/pre-authorizations/${id}`),
    enabled: !!id,
  });
}

export function useCreatePreAuthorization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/pre-authorizations', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'pre-authorizations'] }),
  });
}

export function useApprovePreAuthorization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/pre-authorizations/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'pre-authorizations'] });
    },
  });
}

export function useRejectPreAuthorization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/pre-authorizations/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'pre-authorizations'] });
    },
  });
}

export function useCancelPreAuthorization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/insurance/pre-authorizations/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'pre-authorizations'] });
    },
  });
}

export function useInsuranceClaims(params) {
  return useQuery({
    queryKey: insuranceKeys.claims(params),
    queryFn: () => api.get(`/insurance/claims?${params}`),
    enabled: !!params,
  });
}

export function useInsuranceClaim(id) {
  return useQuery({
    queryKey: insuranceKeys.claim(id),
    queryFn: () => api.get(`/insurance/claims/${id}`),
    enabled: !!id,
  });
}

export function useClaimDashboard() {
  return useQuery({
    queryKey: insuranceKeys.claimDashboard,
    queryFn: () => api.get('/insurance/claims/dashboard'),
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: insuranceKeys.pendingReviews,
    queryFn: () => api.get('/insurance/claims/pending-reviews'),
  });
}

export function useCreateInsuranceClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/claims', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
    },
  });
}

export function useSubmitClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/insurance/claims/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
    },
  });
}

export function useApproveClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/claims/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
    },
  });
}

export function useRejectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/claims/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
    },
  });
}

export function useSettleClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/claims/${id}/settle`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
      queryClient.invalidateQueries({ queryKey: ['insurance', 'settlements'] });
    },
  });
}

export function useInsuranceSettlements(params) {
  return useQuery({
    queryKey: insuranceKeys.settlements(params),
    queryFn: () => api.get(`/insurance/settlements?${params}`),
    enabled: !!params,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/settlements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', 'settlements'] });
      queryClient.invalidateQueries({ queryKey: ['insurance', 'claims'] });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claimDashboard });
    },
  });
}

export function useInsuranceReports(type, params) {
  return useQuery({
    queryKey: insuranceKeys.reports(type, params),
    queryFn: () => api.get(`/insurance/reports/${type}?${params || ''}`),
    enabled: !!type,
  });
}

export function useCheckoutPreview(params) {
  return useQuery({
    queryKey: insuranceKeys.checkoutPreview(params),
    queryFn: () => api.get(`/insurance/checkout-preview?${params}`),
    enabled: !!params,
  });
}

export const denialAppealKeys = {
  list: (params) => ['insurance', 'denial-appeals', params],
};

export function useDenialAppeals(params) {
  return useQuery({
    queryKey: denialAppealKeys.list(params),
    queryFn: () => api.get(`/insurance/denial-appeals?${params || ''}`),
    enabled: !!params,
  });
}

export function useCreateDenialAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/insurance/denial-appeals', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'denial-appeals'] }),
  });
}

export function useUpdateDenialAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/insurance/denial-appeals/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'denial-appeals'] }),
  });
}

export function useResubmitDenialAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/insurance/denial-appeals/${id}/resubmit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', 'denial-appeals'] }),
  });
}
