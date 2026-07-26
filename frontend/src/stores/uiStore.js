import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      hasSeenOnboarding: false,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
    }),
    {
      name: 'jh-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        hasSeenOnboarding: state.hasSeenOnboarding,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
