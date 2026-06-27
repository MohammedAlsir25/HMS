import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

let initialLang = 'en';
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('jh-ui-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.language) initialLang = parsed.state.language;
    }
  } catch (err) { console.warn('[i18n] Failed to load translations', err); }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
