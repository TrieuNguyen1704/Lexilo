"use client";

import type { Screen } from "@/types/navigation";
import { PRIMARY_NAV_ITEMS, type NavItem } from "./navigation-config";

interface MobileBottomNavProps {
  currentScreen: Screen;
  dueCount: number;
  onNavigate: (key: NavItem["key"]) => void;
}

export function MobileBottomNav({
  currentScreen,
  dueCount,
  onNavigate,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200/70 bg-white/90 px-2 py-2 pb-[max(12px,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl md:hidden">
      {PRIMARY_NAV_ITEMS.map(({ key, icon: Icon, label }) => {
        const isActive = currentScreen === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`tap-press relative flex flex-col items-center justify-center rounded-2xl px-3 py-1 transition-all ${
              isActive ? "scale-105 text-[#ff5e3a]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <Icon size={20} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
              {key === "scheduled" && dueCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d2e] px-1 text-[10px] font-black text-white shadow-xs">
                  {dueCount}
                </span>
              )}
            </div>
            <span className={`mt-1 text-[10px] ${isActive ? "font-black" : "font-bold"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
