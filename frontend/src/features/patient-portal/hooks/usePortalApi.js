function getBaseUrl() {
  if (isNativePlatform()) return 'https://al-jawahir-hospital-production.up.railway.app/api';
  return import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
}

function isNativePlatform() {
  return typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);
}

function getToken() {
  return localStorage.getItem('portal_token');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('portal_token');
    window.location.href = '/portal/login';
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export const portalApi = {
  login: (email, password) => request('POST', '/portal/auth/login', { email, password }),
  register: (mrn, phone, email, password, otpCode) =>
    request('POST', '/portal/auth/register', { mrn, phone, email, password, otpCode }),
  forgotPassword: (email) => request('POST', '/portal/auth/forgot-password', { email }),
  changePassword: (currentPassword, newPassword) =>
    request('POST', '/portal/profile/change-password', { currentPassword, newPassword }),
  getProfile: () => request('GET', '/portal/profile'),
  updateProfile: (data) => request('PATCH', '/portal/profile', data),
  getClinics: () => request('GET', '/portal/clinics'),
  getDoctors: (clinicId) => request('GET', `/portal/clinics/${clinicId}/doctors`),
  getAvailability: (clinicId, date) =>
    request('GET', `/portal/appointments/available-slots?clinicId=${clinicId}&date=${date}`),
  bookAppointment: (data) => request('POST', '/portal/appointments', data),
  getAppointments: (status = 'upcoming') =>
    request('GET', `/portal/appointments?status=${status}`),
  cancelAppointment: (id) => request('PATCH', `/portal/appointments/${id}/cancel`),
  getConsultations: () => request('GET', '/portal/records/consultations'),
  getLabResults: () => request('GET', '/portal/records/lab-results'),
  getPrescriptions: () => request('GET', '/portal/records/prescriptions'),
  getImaging: () => request('GET', '/portal/records/imaging'),
  getInvoices: (status = 'all') => request('GET', `/portal/billing/invoices?status=${status}`),
  payInvoice: (invoiceId, amount, cardLast4, cardExpMonth, cardExpYear) =>
    request('POST', `/portal/billing/invoices/${invoiceId}/pay`, { amount, cardLast4, cardExpMonth, cardExpYear }),
  tapCheckout: (invoiceId, amount, currency, patientName, email, phone) =>
    request('POST', '/portal/billing/tap/checkout', { invoiceId, amount, currency, patientName, email, phone }),
  getPaymentHistory: () => request('GET', '/portal/billing/history'),
  getNotificationPrefs: () => request('GET', '/portal/notification-preferences'),
  updateNotificationPrefs: (prefs) => request('PATCH', '/portal/notification-preferences', prefs),
  getAdminStats: () => request('GET', '/portal/admin/stats'),
  getAdminSettings: () => request('GET', '/portal/admin/settings'),
  updateAdminSettings: (settings) => request('PATCH', '/portal/admin/settings', settings),
};
