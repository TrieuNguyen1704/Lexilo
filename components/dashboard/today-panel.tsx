"use client";

import { useMemo } from "react";
import { BookOpen, Brain, CalendarDays, ChevronRight, Plus } from "lucide-react";
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
      <div>
        <b className="text-[#ff6b4a]">Chào bạn 👋</b>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">Hôm nay mình học gì?</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={CalendarDays}
          label="Cần ôn hôm nay"
          value={due.length}
          color="#ff6b4a"
        />
        <MetricCard icon={Plus} label="Thẻ mới đến hạn" value={newDueCount} color="#6c63ff" />
        <MetricCard
          icon={BookOpen}
          label="Đã bắt đầu học"
          value={startedCount}
          color="#17a673"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6c63ff] to-[#5248e8] p-6 text-white shadow-xl sm:p-7">
          <div className="flex justify-between">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                ÔN THEO LỊCH FSRS
              </span>
              <h2 className="mt-5 text-3xl font-black">
                {due.length ? `${due.length} thẻ đang chờ` : "Không có thẻ đến hạn"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-indigo-100">
                Chỉ phiên này mới tự cập nhật lịch khi bạn chọn Quên, Khó, Tốt hoặc Dễ.
              </p>
            </div>
            <Brain className="hidden opacity-20 sm:block" size={100} />
          </div>
          <Button
            onClick={onStart}
            disabled={!due.length}
            className="mt-7 h-12 rounded-xl bg-white px-6 font-black text-[#554ceb] hover:bg-indigo-50"
          >
            Bắt đầu ôn <ChevronRight />
          </Button>
        </div>

        <StreakUsagi
          reviews={data.reviews}
          todayCount={todayCount}
          dueCount={due.length}
          week={week}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Các bộ thẻ</h2>
          <button
            onClick={onLibrary}
            className="text-sm font-bold text-[#6258ef] hover:underline"
          >
            Xem tất cả ({data.decks.length})
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
