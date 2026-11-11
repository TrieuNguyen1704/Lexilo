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
      <nav aria-label="Điều hướng chính" className="sticky top-24 space-y-1.5">
        {PRIMARY_NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = currentScreen === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? "page" : undefined}
              className={`tap-press flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold transition-all ${
                active
                  ? "border-[1.5px] border-violet-200 bg-white text-[#6d28d9] shadow-[var(--clay-shadow-soft)]"
                  : "border-[1.5px] border-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-xl transition-colors ${
                    active ? "bg-violet-100 text-[#6d28d9]" : "bg-transparent text-slate-500"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span>{label}</span>
              </div>
              {key === "scheduled" && dueCount > 0 && (
                <span className="rounded-full bg-[#dc2626] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-xs">
                  {dueCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-6 rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-[#0f172a] p-4.5 text-white shadow-[0_14px_28px_-10px_rgba(30,27,75,0.45),inset_0_1.5px_0_rgba(255,255,255,0.14)]">
          <b className="flex items-center gap-2 text-sm font-extrabold">
            <span
              className={`grid size-7 place-items-center rounded-xl ${
                cloudUser ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/80 text-slate-300"
              }`}
            >
              <Cloud size={15} />
            </span>
            <span>{cloudUser ? "Đang đồng bộ đám mây" : "Lưu trữ máy này"}</span>
          </b>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {cloudUser
              ? `Đã liên kết ${cloudUser.email}. Dữ liệu tự động đồng bộ giữa các thiết bị.`
              : "Dữ liệu đang lưu cục bộ. Bật đồng bộ để kết nối mọi thiết bị."}
          </p>
          <button
            onClick={onOpenSync}
            className="mt-3 inline-flex items-center text-xs font-extrabold text-emerald-300 transition-colors hover:text-emerald-200"
          >
            {cloudUser ? "Quản lý đồng bộ →" : "Bật đồng bộ đám mây →"}
          </button>
        </div>
      </nav>
    </aside>
  );
}
