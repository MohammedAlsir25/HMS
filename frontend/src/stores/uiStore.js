import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'jh-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
      }),
    },
  ),
);
