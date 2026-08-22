'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'id';

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const stored = window.localStorage.getItem('expiry-tracker-language');
      if (stored === 'en' || stored === 'id') setLangState(stored);
    };
    sync();
    setReady(true);
    const timer = window.setInterval(sync, 100);
    window.addEventListener('storage', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem('expiry-tracker-language', lang);
    document.documentElement.lang = lang;
  }, [lang, ready]);

  const value = useMemo(() => ({ lang, setLang: setLangState }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
