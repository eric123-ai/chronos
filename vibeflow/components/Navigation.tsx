"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  Radar,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavigationTab = "today" | "blueprint" | "arsenal" | "insight";

const TAB_ICONS: Record<NavigationTab, LucideIcon> = {
  today: CalendarClock,
  blueprint: Radar,
  arsenal: Shield,
  insight: Target,
};

export function Navigation({
  activeTab,
  labels,
  onChange,
}: {
  activeTab: NavigationTab;
  labels: Record<NavigationTab, string>;
  onChange: (tab: NavigationTab) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(7,10,21,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-3">
        {(Object.keys(TAB_ICONS) as NavigationTab[]).map((tab) => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className="relative flex min-w-[68px] flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300"
            >
              <Icon className="h-4 w-4" />
              {labels[tab]}
              {active ? (
                <motion.span
                  layoutId="chronos-tab"
                  className="absolute -top-1 h-1.5 w-10 rounded-full bg-violet-400"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
