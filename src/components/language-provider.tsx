"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeLanguage, t, type Language, type TranslationKey } from "@/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "brainwave_language";
const cookieName = "preferred_language";

function readCookieLanguage() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
}

function writeCookieLanguage(language: Language) {
  document.cookie = `${cookieName}=${language}; path=/; max-age=31536000; samesite=lax`;
}

function browserDefaultLanguage() {
  if (typeof navigator === "undefined") return "zh";
  const value = navigator.language || navigator.languages?.[0] || "";
  return value.toLowerCase().includes("zh") ? "zh" : "zh";
}

export function LanguageProvider({
  children,
  initialLanguage = "zh",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(storageKey) ||
      readCookieLanguage() ||
      browserDefaultLanguage();
    const normalized = normalizeLanguage(stored);
    setLanguageState(normalized);
    writeCookieLanguage(normalized);
    setReady(true);
  }, []);

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(storageKey, nextLanguage);
    writeCookieLanguage(nextLanguage);

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        preferred_language: nextLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {ready ? <LanguagePreferencePrompt /> : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "zh" as Language,
      setLanguage: async () => undefined,
    };
  }
  return context;
}

export function T({ k }: { k: TranslationKey }) {
  const { language } = useLanguage();
  return <>{t(k, language)}</>;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={clsx(
        "inline-flex items-center rounded border border-white/15 bg-white/10 p-1 text-xs font-black",
        compact && "scale-95",
      )}
      aria-label={t("language.label", language)}
    >
      <button
        type="button"
        onClick={() => void setLanguage("zh")}
        className={clsx(
          "rounded px-2 py-1",
          language === "zh" ? "bg-[#f4c542] text-[#071525]" : "text-white/75",
        )}
      >
        中文
      </button>
      <span className="px-1 text-white/35">|</span>
      <button
        type="button"
        onClick={() => void setLanguage("en")}
        className={clsx(
          "rounded px-2 py-1",
          language === "en" ? "bg-[#f4c542] text-[#071525]" : "text-white/75",
        )}
      >
        EN
      </button>
    </div>
  );
}

function LanguagePreferencePrompt() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasChosen = window.localStorage.getItem(`${storageKey}_chosen`);
    if (hasChosen) return;

    const browserLanguage = navigator.language || navigator.languages?.[0] || "";
    if (browserLanguage.toLowerCase().includes("zh")) {
      window.localStorage.setItem(`${storageKey}_chosen`, "1");
      return;
    }

    setOpen(true);
  }, []);

  async function choose(nextLanguage: Language) {
    window.localStorage.setItem(`${storageKey}_chosen`, "1");
    await setLanguage(nextLanguage);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl md:bottom-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f8a4b]">
        {t("language.title", language)}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {t("language.helper", language)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void choose("zh")}
          className="h-11 rounded bg-[#d71920] font-black text-white"
        >
          中文
        </button>
        <button
          type="button"
          onClick={() => void choose("en")}
          className="h-11 rounded bg-[#071525] font-black text-white"
        >
          English
        </button>
      </div>
    </div>
  );
}
