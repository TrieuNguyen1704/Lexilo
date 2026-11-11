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
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/88 shadow-[0_4px_20px_-6px_rgba(124,58,237,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onGoHome}
          className="tap-press flex items-center gap-3 rounded-2xl pr-2 focus-visible:outline-none"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#f97316] text-white shadow-[0_6px_18px_rgba(255,107,74,0.36),inset_0_1.5px_0_rgba(255,255,255,0.45)]">
            <Brain size={21} strokeWidth={2.25} />
          </span>
          <b className="font-display text-2xl font-bold tracking-tight text-slate-900">Lexilo</b>
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-orange-200/80 bg-[#fff3ec] px-3.5 py-1.5 text-xs font-extrabold text-[#c2410c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:flex">
            <Flame size={15} className="fill-[#ff6b4a] text-[#ff6b4a]" />
            <span>{todayCount} lượt hôm nay</span>
          </span>

          <Button
            onClick={onOpenSync}
            variant="outline"
            className={`tap-press h-10 gap-1.5 rounded-2xl border-[1.5px] px-3 text-xs font-bold shadow-[var(--clay-shadow-soft)] sm:h-9 ${
              cloudUser
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-[var(--border)] bg-white text-slate-700 hover:border-violet-200 hover:text-slate-900"
            }`}
          >
            <Cloud size={15} className={cloudUser ? "text-emerald-600" : "text-slate-500"} />
            <span className="hidden max-w-[120px] truncate sm:inline">
              {cloudUser ? cloudUser.email?.split("@")[0] : "Đồng bộ đám mây"}
            </span>
            <span className="sm:hidden">Đồng bộ</span>
          </Button>

          <Button
            onClick={onOpenGemini}
            variant="outline"
            className={`tap-press relative size-10 shrink-0 rounded-2xl border-[1.5px] p-0 shadow-[var(--clay-shadow-soft)] sm:size-9 ${
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
            className="tap-press relative size-10 shrink-0 rounded-2xl border-[1.5px] border-[var(--border)] bg-white p-0 text-slate-600 shadow-[var(--clay-shadow-soft)] hover:border-violet-200 hover:text-slate-900 sm:size-9"
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
            className="clay-cta h-10 rounded-2xl bg-[#7c3aed] px-3.5 font-bold text-white hover:bg-[#6d28d9] sm:h-9"
          >
            <Plus size={16} strokeWidth={2.5} /> Thêm thẻ
          </Button>
        </div>
      </div>
    </header>
  );
}
