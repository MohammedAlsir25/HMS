import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      hospitalId: null,
      isAuthenticated: false,

      getHospitalId: () => get().hospitalId || get().user?.hospitalId || null,

      login: (token, refreshToken, user) =>
        set({
          token,
          refreshToken,
          user,
          hospitalId: user?.hospitalId || null,
          isAuthenticated: true,
        }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      setUser: (user) =>
        set({ user, hospitalId: user?.hospitalId || null }),

      logout: () =>
        set({ token: null, refreshToken: null, user: null, hospitalId: null, isAuthenticated: false }),
    }),
    {
      name: 'jh-auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        hospitalId: state.hospitalId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
