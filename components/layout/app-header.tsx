"use client";

import { Bell, Brain, Cloud, Flame, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CloudUser } from "@/types/lexilo";

interface AppHeaderProps {
  todayCount: number;
  dueCount: number;
  cloudUser: CloudUser | null;
  geminiActive: boolean;
  onGoHome: () => void;
  onOpenSync: () => void;
  onOpenGemini: () => void;
  onOpenNotifications: () => void;
  onCreateDeck: () => void;
  onQuickAddCard: () => void;
}

export function AppHeader({
  todayCount,
  dueCount,
  cloudUser,
  geminiActive,
  onGoHome,
  onOpenSync,
  onOpenGemini,
  onOpenNotifications,
  onCreateDeck,
  onQuickAddCard,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 shadow-[0_4px_20px_-6px_rgba(124,58,237,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <button
          onClick={onGoHome}
          className="tap-press flex min-w-0 shrink-0 items-center gap-2 rounded-2xl pr-1 focus-visible:outline-none sm:gap-3 sm:pr-2"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b4a] to-[#f97316] text-white shadow-[0_6px_16px_rgba(255,107,74,0.34),inset_0_1.5px_0_rgba(255,255,255,0.45)] sm:size-10 sm:rounded-2xl">
            <Brain size={19} strokeWidth={2.25} />
          </span>
          <b className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
            Lexilo
          </b>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-orange-200/80 bg-[#fff3ec] px-3.5 py-1.5 text-xs font-extrabold text-[#c2410c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:flex">
            <Flame size={15} className="fill-[#ff6b4a] text-[#ff6b4a]" />
            <span>{todayCount} lượt hôm nay</span>
          </span>

          <Button
            onClick={onOpenSync}
            variant="outline"
            aria-label={cloudUser ? `Đồng bộ đám mây (${cloudUser.email})` : "Đồng bộ đám mây"}
            className={`tap-press relative size-9 shrink-0 rounded-xl border-[1.5px] p-0 text-xs font-bold shadow-[var(--clay-shadow-soft)] sm:h-9 sm:w-auto sm:gap-1.5 sm:rounded-2xl sm:px-3 ${
              cloudUser
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-[var(--border)] bg-white text-slate-700 hover:border-violet-200 hover:text-slate-900"
            }`}
          >
            <Cloud size={16} className={cloudUser ? "text-emerald-600" : "text-slate-500"} />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {cloudUser ? cloudUser.email?.split("@")[0] : "Đồng bộ đám mây"}
            </span>
            {cloudUser && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white sm:hidden" />
            )}
          </Button>

          <Button
            onClick={onOpenGemini}
            variant="outline"
            className={`tap-press relative size-9 shrink-0 rounded-xl border-[1.5px] p-0 shadow-[var(--clay-shadow-soft)] sm:rounded-2xl ${
              geminiActive
                ? "border-violet-300 bg-violet-50 text-[#6d28d9] hover:bg-violet-100"
                : "border-[var(--border)] bg-white text-slate-600 hover:border-violet-200 hover:text-slate-900"
            }`}
            title="Cài đặt Gemini AI"
            aria-label="Cài đặt Gemini AI"
          >
            <Sparkles size={16} />
            {geminiActive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-[#7c3aed] ring-2 ring-white" />
            )}
          </Button>

          <Button
            onClick={onOpenNotifications}
            variant="outline"
            className="tap-press relative size-9 shrink-0 rounded-xl border-[1.5px] border-[var(--border)] bg-white p-0 text-slate-600 shadow-[var(--clay-shadow-soft)] hover:border-violet-200 hover:text-slate-900 sm:rounded-2xl"
            title="Cài đặt thông báo"
            aria-label="Cài đặt thông báo"
          >
            <Bell size={16} />
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6b4a] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff6b4a] ring-2 ring-white" />
              </span>
            )}
          </Button>

          <Button
            onClick={onCreateDeck}
            variant="outline"
            className="tap-press hidden h-9 rounded-2xl border-[1.5px] border-[var(--border)] bg-white font-bold text-slate-700 shadow-[var(--clay-shadow-soft)] hover:border-violet-200 hover:bg-violet-50/40 hover:text-slate-900 sm:inline-flex"
          >
            <Plus size={16} /> Tạo bộ thẻ
          </Button>

          <Button
            onClick={onQuickAddCard}
            className="clay-cta h-9 rounded-xl bg-[#7c3aed] px-2.5 text-xs font-bold text-white hover:bg-[#6d28d9] sm:rounded-2xl sm:px-3.5 sm:text-sm"
            aria-label="Thêm thẻ mới"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="sm:hidden">Thẻ</span>
            <span className="hidden sm:inline">Thêm thẻ</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
