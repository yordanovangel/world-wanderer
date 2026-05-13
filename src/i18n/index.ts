import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import bg from './locales/bg.json';
import en from './locales/en.json';

export const SUPPORTED = ['bg', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED)[number];

const LANG_KEY = 'rq_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bg: { translation: bg },
      en: { translation: en },
    },
    fallbackLng: 'bg',
    supportedLngs: SUPPORTED as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_KEY,
      caches: ['localStorage'],
    },
  });

export function currentLanguage(): AppLanguage {
  const lng = (i18n.language || 'bg').toLowerCase().split('-')[0];
  return (SUPPORTED.includes(lng as AppLanguage) ? lng : 'bg') as AppLanguage;
}

export function setAppLanguage(lng: AppLanguage) {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
