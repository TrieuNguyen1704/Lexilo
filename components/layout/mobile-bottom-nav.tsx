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
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-white/98 px-2 py-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-6px_rgba(124,58,237,0.1)] md:hidden"
      style={{ transform: "translateZ(0)" }}
    >
      {PRIMARY_NAV_ITEMS.map(({ key, icon: Icon, label }) => {
        const isActive = currentScreen === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            aria-current={isActive ? "page" : undefined}
            className={`tap-press relative flex min-h-11 min-w-15 flex-col items-center justify-center rounded-2xl px-2.5 py-1 transition-all ${
              isActive
                ? "bg-violet-50 text-[#6d28d9]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="relative">
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
              {key === "scheduled" && dueCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-black text-white shadow-xs">
                  {dueCount}
                </span>
              )}
            </div>
            <span className={`mt-0.5 text-[11px] leading-tight ${isActive ? "font-extrabold" : "font-bold"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
