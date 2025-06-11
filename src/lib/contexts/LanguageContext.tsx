'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, getLocale, useTranslations } from '../i18n';

interface LanguageContextType {
  locale: Locale;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en');
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useTranslations(locale);

  useEffect(() => {
    // Set locale based on browser language on client side
    const browserLocale = getLocale();
    setLocale(browserLocale);
    setIsLoaded(true);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 