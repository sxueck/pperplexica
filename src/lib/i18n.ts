// Simple i18n implementation for English and Chinese
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

// Get browser language or default to English
export const getLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    return locales.includes(browserLang as Locale) ? (browserLang as Locale) : 'en';
  }
  return 'en';
};

// Import translation messages
import enMessages from '../../messages/en.json';
import zhMessages from '../../messages/zh.json';

const messages: Record<Locale, any> = {
  en: enMessages,
  zh: zhMessages
};

// Helper function to get nested value from object using dot notation
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};

// Get translation function
export const useTranslations = (locale: Locale = getLocale()) => {
  return (key: string): string => {
    return getNestedValue(messages[locale], key) || key;
  };
}; 