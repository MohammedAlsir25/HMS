import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

class ApiClient {
  async request(method, path, body, opts = {}) {
    const token = useAuthStore.getState().token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: opts.signal,
      });
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
            const retry = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
      if (err.name === 'AbortError') throw err;
      throw err;
    }
  }

  async refresh() {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
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
    const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData, signal: opts.signal });
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refresh();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
            const retry = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
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
  }

  get(path, opts) { return this.request('GET', path, undefined, opts); }
  post(path, body, opts) { return this.request('POST', path, body, opts); }
  put(path, body, opts) { return this.request('PUT', path, body, opts); }
  patch(path, body, opts) { return this.request('PATCH', path, body, opts); }
  delete(path, opts) { return this.request('DELETE', path, undefined, opts); }
}

export const api = new ApiClient();
