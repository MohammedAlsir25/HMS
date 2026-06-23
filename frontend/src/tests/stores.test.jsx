import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('handles login', () => {
    useAuthStore.getState().login('token123', 'refresh456', { id: '1', email: 'test@test.com' });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('token123');
    expect(state.user.email).toBe('test@test.com');
  });

  it('handles logout', () => {
    useAuthStore.getState().login('token', 'refresh', { id: '1' });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('handles token refresh', () => {
    useAuthStore.getState().login('old', 'oldrefresh', { id: '1' });
    useAuthStore.getState().setTokens('newtoken', 'newrefresh');
    const state = useAuthStore.getState();
    expect(state.token).toBe('newtoken');
    expect(state.refreshToken).toBe('newrefresh');
  });
});

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'light', language: 'en' });
  });

  it('starts with defaults', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('light');
    expect(state.language).toBe('en');
  });

  it('toggles theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('sets language', () => {
    useUIStore.getState().setLanguage('ar');
    expect(useUIStore.getState().language).toBe('ar');
  });
});
