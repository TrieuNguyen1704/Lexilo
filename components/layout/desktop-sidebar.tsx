"use client";

import { Cloud } from "lucide-react";
import type { CloudUser } from "@/types/lexilo";
import type { Screen } from "@/types/navigation";
import { PRIMARY_NAV_ITEMS, type NavItem } from "./navigation-config";

interface DesktopSidebarProps {
  currentScreen: Screen;
  dueCount: number;
  cloudUser: CloudUser | null;
  onNavigate: (key: NavItem["key"]) => void;
  onOpenSync: () => void;
}

export function DesktopSidebar({
  currentScreen,
  dueCount,
  cloudUser,
  onNavigate,
  onOpenSync,
}: DesktopSidebarProps) {
  return (
    <aside className="hidden md:block">
      <nav className="sticky top-24 space-y-1">
        {PRIMARY_NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = currentScreen === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`tap-press flex w-full items-center justify-between rounded-2xl px-4 py-3 font-bold transition-all ${
                active
                  ? "border border-orange-100 bg-white text-[#ff5e3a] shadow-xs"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={19} className={active ? "stroke-[2.5]" : "stroke-[2]"} />
                <span>{label}</span>
              </div>
              {key === "scheduled" && dueCount > 0 && (
                <span className="animate-pulse rounded-full bg-[#ff4d2e] px-2 py-0.5 text-[11px] font-black text-white">
                  {dueCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-6 rounded-2xl bg-[#17233b] p-4 text-white shadow-sm">
          <b className="flex items-center gap-1.5 text-sm">
            <Cloud size={16} className={cloudUser ? "text-emerald-400" : "text-slate-400"} />
            {cloudUser ? "Đang đồng bộ đám mây" : "Lưu trữ máy này"}
          </b>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            {cloudUser
              ? `Đã liên kết ${cloudUser.email}. Dữ liệu tự động đồng bộ giữa các thiết bị.`
              : "Dữ liệu được lưu cục bộ. Bật đồng bộ để kết nối giữa các thiết bị."}
          </p>
          <button
            onClick={onOpenSync}
            className="mt-2.5 block text-xs font-bold text-[#ff6b4a] hover:underline"
          >
            {cloudUser ? "Quản lý đồng bộ →" : "Bật đồng bộ đám mây →"}
          </button>
        </div>
      </nav>
    </aside>
  );
}
