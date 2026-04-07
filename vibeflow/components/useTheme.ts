"use client";

import { useEffect, useState } from "react";

const SETTINGS_KEY = "chronos.settings.v1";

type AppSettings = {
  surfaceMode?: "default" | "flat";
  themeMode?: "paper" | "obsidian";
};

export function useTheme() {
  const [isFlatMode, setFlat] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const json = JSON.parse(raw) as AppSettings;
      setFlat(json.surfaceMode === "flat");
    } catch {}
  }, []);

  return { isFlatMode };
}
