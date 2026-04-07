"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  Radar,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavigationTab = "today" | "list" | "calendar" | "insight";

const TAB_ICONS: Record<NavigationTab, LucideIcon> = {
  today: CalendarClock,
  list: Shield,
  calendar: Radar,
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
    <div className="chronos-nav fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-3">
        {(Object.keys(TAB_ICONS) as NavigationTab[]).map((tab) => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`chronos-nav-item relative flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-medium transition ${active ? "is-active" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {labels[tab]}
              {active ? (
                <motion.span
                  layoutId="chronos-tab"
                  className="chronos-nav-indicator absolute bottom-0 h-1.5 w-10 rounded-full"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
