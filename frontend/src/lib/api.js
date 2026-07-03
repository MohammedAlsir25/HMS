import { useAuthStore } from '../stores/authStore';

function getBaseUrl() {
  if (isNativePlatform()) return 'https://al-jawahir-hospital-production.up.railway.app/api';
  return import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
}

function isNativePlatform() {
  return typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);
}

function urlToTableKey(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'pos') {
    if (parts[1] === 'items') return 'inventoryItem';
    if (parts[1] === 'pharmacy' || parts[1] === 'optics') {
      if (parts[2] === 'items') return 'inventoryItem';
    }
    if (parts[1] === 'suppliers') return 'supplier';
    if (parts[1] === 'invoices') return 'supplierInvoice';
    return null;
  }
  if (parts[0] === 'inventory') {
    if (parts[1] === 'items') return 'inventoryItem';
    if (parts[1] === 'transactions') return 'inventoryTransaction';
    return null;
  }
  if (parts[0] === 'referrals') return 'referral';
  if (parts[0] === 'appointments') return 'appointment';
  if (parts[0] === 'patients') return 'patient';
  if (parts[0] === 'expenses') return 'expense';
  if (parts[0] === 'reception') return 'appointment';
  if (parts[0] === 'accounting') {
    if (parts[1] === 'debts') return 'accountsPayable';
    if (parts[1] === 'shifts') return 'shift';
    if (parts[1] === 'transactions') return 'transaction';
    return null;
  }
  if (parts[0] === 'procurement') return null;
  if (parts[0] === 'admin') return null;
  if (parts[0] === 'hr') return null;
  return null;
}

async function cacheGet(path, data) {
  if (!isNativePlatform()) return;
  try {
    const table = urlToTableKey(path);
    if (!table || !Array.isArray(data)) return;
    const { localDb } = await import('./sync/localDb');
    await localDb.putMany(table, data);
  } catch { /* silent */ }
}

async function cacheGetSingle(path, data) {
  if (!isNativePlatform()) return;
  if (!data || !data.id) return;
  try {
    const table = urlToTableKey(path);
    if (!table) return;
    const { localDb } = await import('./sync/localDb');
    await localDb.put(table, data);
  } catch { /* silent */ }
}

async function queueOffline(method, path, body) {
  if (!isNativePlatform()) return;
  try {
    const { syncEngine } = await import('./sync/syncEngine');
    await syncEngine.queueMutation({
      table: urlToTableKey(path) || path.split('/')[1] || 'unknown',
      action: method === 'POST' ? 'create' : method === 'PUT' || method === 'PATCH' ? 'update' : 'delete',
      recordId: body?.id || crypto.randomUUID(),
      data: body || {},
      clientTimestamp: new Date().toISOString(),
    });
  } catch { /* silent */ }
}

class ApiClient {
  async request(method, path, body, opts = {}) {
    const token = useAuthStore.getState().token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const doFetch = () => fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: opts.signal,
    });
    const isRead = method === 'GET';
    try {
      const res = await doFetch();
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
            const retry = await fetch(`${getBaseUrl()}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
            if (!retry.ok) { const e = await retry.json().catch(() => ({ message: retry.statusText })); throw new Error(e.message || 'Request failed'); }
            const result = await retry.json();
            if (isRead && Array.isArray(result)) cacheGet(path, result);
            else if (isRead && result && result.id) cacheGetSingle(path, result);
            return result;
          }
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return null;
        }
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return null;
      }
      if (!res.ok) { const err = await res.json().catch(() => ({ message: res.statusText })); throw new Error(err.message || 'Request failed'); }
      const result = await res.json();
      if (isRead && Array.isArray(result)) cacheGet(path, result);
      else if (isRead && result && result.id) cacheGetSingle(path, result);
      return result;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (!isNativePlatform()) throw err;
      if (isRead) {
        try {
          const table = urlToTableKey(path);
          if (table) {
            const { localDb } = await import('./sync/localDb');
            const cached = await localDb.getAll(table);
            if (cached.length > 0) return cached;
          }
        } catch { /* silent */ }
      } else {
        await queueOffline(method, path, body);
      }
      throw err;
    }
  }

  async refresh() {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      useAuthStore.getState().setTokens(data.token, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  async upload(path, formData, opts = {}) {
    const token = useAuthStore.getState().token;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${getBaseUrl()}${path}`, { method: 'POST', headers, body: formData, signal: opts.signal });
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
            const retry = await fetch(`${getBaseUrl()}${path}`, { method: 'POST', headers, body: formData });
            if (!retry.ok) { const e = await retry.json().catch(() => ({ message: retry.statusText })); throw new Error(e.message || 'Request failed'); }
            return retry.json();
          }
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return null;
        }
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return null;
      }
      if (!res.ok) { const err = await res.json().catch(() => ({ message: res.statusText })); throw new Error(err.message || 'Request failed'); }
      return res.json();
    } catch (err) {
      if (!isNativePlatform()) throw err;
      await queueOffline('POST', path, null);
      throw err;
    }
  }

  get(path, opts) { return this.request('GET', path, undefined, opts); }
  post(path, body, opts) { return this.request('POST', path, body, opts); }
  put(path, body, opts) { return this.request('PUT', path, body, opts); }
  patch(path, body, opts) { return this.request('PATCH', path, body, opts); }
  delete(path, opts) { return this.request('DELETE', path, undefined, opts); }
}

export const api = new ApiClient();
