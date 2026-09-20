import React, { createContext, useContext, useState, useEffect } from 'react';
import ar from '../i18n/ar.json';
import fr from '../i18n/fr.json';
import en from '../i18n/en.json';

const translations = { ar, fr, en };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('alnour_lang') || 'ar');

  useEffect(() => {
    localStorage.setItem('alnour_lang', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (path, varsOrFallback = {}, maybeFallback = '') => {
    const isVars = varsOrFallback && typeof varsOrFallback === 'object' && !Array.isArray(varsOrFallback);
    const fallback = isVars ? maybeFallback : (typeof varsOrFallback === 'string' ? varsOrFallback : '');
    const vars = isVars ? varsOrFallback : {};

    const keys = path.split('.');
    let current = translations[lang];
    let found = true;

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }

    let result = found ? current : null;

    if (result === null || result === undefined) {
      // Fallback to Arabic if missing in FR/EN
      let arabicFallback = translations.ar;
      let arabicFound = true;
      for (const k of keys) {
        if (arabicFallback && arabicFallback[k] !== undefined) {
          arabicFallback = arabicFallback[k];
        } else {
          arabicFound = false;
          break;
        }
      }
      result = arabicFound ? arabicFallback : (fallback || path);
    }

    if (typeof result === 'string' && Object.keys(vars).length > 0) {
      for (const [vKey, vVal] of Object.entries(vars)) {
        result = result.replaceAll(`{${vKey}}`, vVal !== undefined && vVal !== null ? vVal : '');
      }
    }

    return result;
  };

  const isRTL = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
