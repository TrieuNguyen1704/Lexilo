"use client";

import { useMemo } from "react";
import { BookOpen, Brain, CalendarDays, ChevronRight, Plus, Sparkles } from "lucide-react";
import { DeckCard } from "@/components/decks/deck-card";
import { Button } from "@/components/ui/button";
import { computeDeckStatsMap } from "@/lib/domain/cards";
import type { Card, Deck, Store } from "@/types/lexilo";
import type { WeekDayStat } from "@/types/navigation";
import { MetricCard } from "./metric-card";
import { StreakUsagi } from "./streak-usagi";

interface TodayPanelProps {
  data: Store;
  due: Card[];
  now: number;
  todayCount: number;
  week: WeekDayStat[];
  onStart: () => void;
  onLibrary: () => void;
  onOpenDeck: (id: string) => void;
  onFree: (deck: Deck) => void;
  onDue: (deck: Deck) => void;
}

export function TodayPanel({
  data,
  due,
  now,
  todayCount,
  week,
  onStart,
  onLibrary,
  onOpenDeck,
  onFree,
  onDue,
}: TodayPanelProps) {
  const newDueCount = useMemo(() => due.filter((card) => !card.reps).length, [due]);
  const startedCount = useMemo(
    () => data.cards.filter((card) => card.reps > 0).length,
    [data.cards],
  );
  const statsMap = useMemo(
    () => computeDeckStatsMap(data.decks, data.cards, now),
    [data.decks, data.cards, now],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-[#fff3ec] px-3 py-1 text-xs font-extrabold text-[#c2410c]">
          <Sparkles size={13} className="text-[#ff6b4a]" />
          <span>Chào bạn, giữ vững nhịp nhé</span>
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Hôm nay mình học gì?
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          icon={CalendarDays}
          label="Cần ôn hôm nay"
          value={due.length}
          color="#ff6b4a"
        />
        <MetricCard icon={Plus} label="Thẻ mới đến hạn" value={newDueCount} color="#7c3aed" />
        <MetricCard
          icon={BookOpen}
          label="Đã bắt đầu học"
          value={startedCount}
          color="#059669"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[28px] border border-violet-400/40 bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] p-5 text-white shadow-[0_18px_38px_-10px_rgba(109,40,217,0.45),inset_0_2px_0_rgba(255,255,255,0.28)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-extrabold tracking-wide text-white uppercase backdrop-blur-xs">
                Ôn theo lịch FSRS
              </span>
              <h2 className="font-display mt-4 sm:mt-5 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                {due.length ? `${due.length} thẻ đang chờ` : "Không có thẻ đến hạn"}
              </h2>
              <p className="mt-2.5 max-w-md text-sm leading-relaxed font-medium text-violet-100">
                Chỉ phiên này mới tự cập nhật lịch khi bạn chọn Quên, Khó, Tốt hoặc Dễ.
              </p>
            </div>
            <Brain
              className="hidden shrink-0 text-white/15 sm:block"
              size={104}
              strokeWidth={1.6}
            />
          </div>

          <div className="relative z-10 mt-7 flex flex-wrap items-center gap-3">
            <Button
              onClick={onStart}
              disabled={!due.length}
              className="clay-cta h-12 rounded-2xl bg-white px-6 text-sm font-extrabold text-[#5b21b6] hover:bg-violet-50 disabled:bg-white/75 disabled:text-violet-400"
            >
              <span>Bắt đầu ôn</span>
              <ChevronRight size={18} strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        <StreakUsagi
          reviews={data.reviews}
          todayCount={todayCount}
          dueCount={due.length}
          week={week}
        />
      </div>

      <div>
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Các bộ thẻ</h2>
          <button
            onClick={onLibrary}
            className="rounded-xl px-2.5 py-1 text-sm font-extrabold text-[#6d28d9] transition-colors hover:bg-violet-50 hover:text-[#5b21b6]"
          >
            Xem tất cả ({data.decks.length})
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.decks.map((deck) => {
            const stats = statsMap.get(deck.id) ?? { total: 0, due: 0, hard: 0 };
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                count={stats.total}
                due={stats.due}
                onOpen={() => onOpenDeck(deck.id)}
                onFree={() => onFree(deck)}
                onDue={() => onDue(deck)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
