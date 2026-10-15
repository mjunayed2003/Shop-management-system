'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { bn } from './translations/bn';
import { en } from './translations/en';

export type Locale = 'bn' | 'en';
export type TranslationDict = typeof bn;

const translations: Record<Locale, TranslationDict> = {
  bn,
  en,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'pos_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Default to Bangla ('bn') as explicitly required
  const [locale, setLocaleState] = useState<Locale>('bn');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === 'bn' || saved === 'en')) {
        setLocaleState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'bn' ? 'en' : 'bn');
  }, [locale, setLocale]);

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      const keys = keyPath.split('.');
      let current: any = translations[locale];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to English if key missing in Bangla
          let fallback: any = translations.en;
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = fallback[fbKey];
            } else {
              return keyPath;
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== 'string') {
        return keyPath;
      }

      if (params) {
        let result = current;
        for (const [paramKey, paramVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }
        return result;
      }

      return current;
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for non-provider usage (e.g. tests or isolated components)
    return {
      locale: 'bn' as Locale,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (keyPath: string, params?: Record<string, string | number>) => {
        const keys = keyPath.split('.');
        let current: any = bn;
        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            return keyPath;
          }
        }
        if (typeof current !== 'string') return keyPath;
        if (params) {
          let res = current;
          for (const [k, v] of Object.entries(params)) {
            res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
          return res;
        }
        return current;
      },
    };
  }
  return context;
}
