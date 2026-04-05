"use client";

import { Languages } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../lib/locales";
import { useI18n } from "./I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo<Array<{ label: "CN" | "EN"; value: Locale }>>(
    () => [
      { label: "CN", value: "cn" },
      { label: "EN", value: "en" },
    ],
    [],
  );

  const choose = useCallback(
    (value: Locale) => {
      setLocale(value);
      setOpen(false);
    },
    [setLocale],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Language"
        onClick={() => setOpen((v) => !v)}
        className="glass-mini flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-zinc-900 transition hover:bg-white/40"
      >
        <Languages className="h-4 w-4" />
        <span className="tabular-nums">{locale === "cn" ? "CN" : "EN"}</span>
      </button>

      {open ? (
        <div className="lang-popover absolute right-0 top-10 w-20 overflow-hidden rounded-2xl p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              className={[
                "lang-item flex h-8 w-full items-center justify-center rounded-xl text-xs font-medium text-zinc-900",
                opt.value === locale ? "bg-white/50" : "",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
