"use client";

import clsx from "clsx";
import { useLanguage } from "@/components/language-provider";
import { t, type Language } from "@/i18n";

export function ProfileLanguageCard() {
  const { language, setLanguage } = useLanguage();

  const options: Array<{ value: Language; label: string }> = [
    { value: "zh", label: "中文（默认）" },
    { value: "en", label: "English" },
  ];

  return (
    <div className="rounded bg-slate-100 p-3">
      <p className="text-sm font-black text-slate-600">
        {t("profile.languagePreference", language)}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => void setLanguage(option.value)}
            className={clsx(
              "h-10 rounded font-black",
              language === option.value
                ? "bg-[#071525] text-white"
                : "bg-white text-slate-600",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
