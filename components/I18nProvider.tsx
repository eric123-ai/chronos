"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale, MessageKey } from "../lib/locales";
import { LOCALE_STORAGE_KEY, messages } from "../lib/locales";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLocale(value: string | null): Locale {
  return value === "en" ? "en" : "cn";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("cn");

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      const stored = normalizeLocale(
        window.localStorage.getItem(LOCALE_STORAGE_KEY),
      );
      setLocaleState((prev) => (prev === stored ? prev : stored));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback((key: MessageKey) => messages[locale][key], [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
