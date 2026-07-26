import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { portalApi } from './usePortalApi';

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('portal_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    portalApi.getProfile()
      .then((data) => setPatient(data))
      .catch(() => {
        setToken(null);
        setPatient(null);
        localStorage.removeItem('portal_token');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await portalApi.login(email, password);
    localStorage.setItem('portal_token', data.token);
    setToken(data.token);
    setPatient(data.patient);
    return data;
  }, []);

  const register = useCallback(async (mrn, phone, email, password, otpCode) => {
    const data = await portalApi.register(mrn, phone, email, password, otpCode);
    localStorage.setItem('portal_token', data.token);
    setToken(data.token);
    setPatient(data.patient);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('portal_token');
    setToken(null);
    setPatient(null);
  }, []);

  const value = {
    patient,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider');
  return ctx;
}
