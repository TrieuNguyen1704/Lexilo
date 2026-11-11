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
    <header className="sticky top-0 z-20 border-b border-[#e5e8f0] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-5">
        <button onClick={onGoHome} className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#ff6b4a] text-white shadow-[0_8px_22px_#ff6b4a42]">
            <Brain size={22} />
          </span>
          <b className="text-xl tracking-tight">Lexilo</b>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full bg-[#fff2ed] px-3.5 py-1.5 text-sm font-bold text-[#e65332] sm:flex">
            <Flame size={17} />
            {todayCount} lượt hôm nay
          </span>

          <Button
            onClick={onOpenSync}
            variant="outline"
            className={`h-9 gap-1.5 rounded-xl text-xs font-semibold ${
              cloudUser
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "text-[#667085] hover:text-[#17233b]"
            }`}
          >
            <Cloud size={16} className={cloudUser ? "text-emerald-500" : ""} />
            <span className="hidden sm:inline">
              {cloudUser ? cloudUser.email?.split("@")[0] : "Đồng bộ đám mây"}
            </span>
            <span className="sm:hidden">Đồng bộ</span>
          </Button>

          <Button
            onClick={onOpenGemini}
            variant="outline"
            className={`tap-press relative h-9 w-9 shrink-0 rounded-xl p-0 ${
              geminiActive
                ? "border-indigo-300 bg-indigo-50 text-[#6366f1] hover:bg-indigo-100"
                : "text-[#667085] hover:text-[#17233b]"
            }`}
            title="Cài đặt Gemini AI"
            aria-label="Cài đặt Gemini AI"
          >
            <Sparkles size={16} />
            {geminiActive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
            )}
          </Button>

          <Button
            onClick={onOpenNotifications}
            variant="outline"
            className="tap-press relative h-9 w-9 shrink-0 rounded-xl p-0 text-[#667085] hover:text-[#17233b]"
            title="Cài đặt thông báo"
            aria-label="Cài đặt thông báo"
          >
            <Bell size={16} />
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff5e3a] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff5e3a]" />
              </span>
            )}
          </Button>

          <Button
            onClick={onCreateDeck}
            variant="outline"
            className="hidden rounded-xl sm:inline-flex"
          >
            <Plus size={16} /> Tạo bộ thẻ
          </Button>

          <Button
            onClick={onQuickAddCard}
            className="rounded-xl bg-[#6c63ff] font-bold text-white hover:bg-[#5b52f5]"
          >
            <Plus size={16} /> Thêm thẻ
          </Button>
        </div>
      </div>
    </header>
  );
}
