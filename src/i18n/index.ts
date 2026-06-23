import en from "@/i18n/en";
import zh from "@/i18n/zh";

export type Language = "zh" | "en";
export type TranslationKey = keyof typeof zh;

export const dictionaries = { zh, en } as const;

export function normalizeLanguage(value?: string | null): Language {
  return value === "en" ? "en" : "zh";
}

export function t(key: TranslationKey, language: Language = "zh") {
  return dictionaries[language][key] ?? dictionaries.zh[key] ?? key;
}
