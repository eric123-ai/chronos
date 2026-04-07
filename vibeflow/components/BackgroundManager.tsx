"use client";

import { motion } from "framer-motion";

export const BACKGROUND_PRESETS = [
  "deep-space",
  "forest-mist",
  "aurora-pulse",
] as const;

export type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number];

const BACKGROUND_CLASS_MAP: Record<BackgroundPreset, string> = {
  "deep-space": "from-[#020617] via-[#0f172a] to-[#312e81]",
  "forest-mist": "from-[#020617] via-[#052e2b] to-[#14532d]",
  "aurora-pulse": "from-[#12051f] via-[#2e1065] to-[#0f172a]",
};

const GLOW_CLASS_MAP: Record<BackgroundPreset, string> = {
  "deep-space":
    "bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_0,transparent_40%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.22),transparent_0,transparent_42%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.18),transparent_0,transparent_48%)]",
  "forest-mist":
    "bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.16),transparent_0,transparent_40%),radial-gradient(circle_at_82%_14%,rgba(74,222,128,0.18),transparent_0,transparent_36%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_0,transparent_48%)]",
  "aurora-pulse":
    "bg-[radial-gradient(circle_at_18%_24%,rgba(244,114,182,0.18),transparent_0,transparent_36%),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.24),transparent_0,transparent_40%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.16),transparent_0,transparent_54%)]",
};

export function BackgroundManager({
  currentBackground,
}: {
  currentBackground: BackgroundPreset;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div
        key={currentBackground}
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className={[
          "absolute inset-0 bg-gradient-to-br transition-[background] duration-700",
          BACKGROUND_CLASS_MAP[currentBackground],
        ].join(" ")}
      />
      <motion.div
        key={`${currentBackground}-glow`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className={[
          "absolute inset-0 blur-3xl saturate-150",
          GLOW_CLASS_MAP[currentBackground],
        ].join(" ")}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.12),rgba(2,6,23,0.55))]" />
    </div>
  );
}
