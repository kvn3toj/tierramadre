/**
 * Language Context - Multi-language Support (6 languages)
 *
 * Supported: Spanish, English, French, Italian, Chinese, Portuguese
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, LANGUAGE_OPTIONS } from '../locales';
import type { Language, Translations } from '../locales';
import { STORAGE_KEYS } from '../constants/storage-keys';

export type { Language };

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

/** Validate that a stored value is a valid language code */
const isValidLanguage = (value: string | null): value is Language => {
  return value !== null && LANGUAGE_OPTIONS.some(opt => opt.code === value);
};

export { LANGUAGE_OPTIONS };

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return isValidLanguage(saved) ? saved : 'es'; // Default: Spanish
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Legacy toggle — cycles through all languages in order
  const toggleLanguage = () => {
    setLanguageState((prev) => {
      const currentIndex = LANGUAGE_OPTIONS.findIndex(opt => opt.code === prev);
      const nextIndex = (currentIndex + 1) % LANGUAGE_OPTIONS.length;
      return LANGUAGE_OPTIONS[nextIndex].code;
    });
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
