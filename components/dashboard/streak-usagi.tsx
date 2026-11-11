"use client";

import { useMemo, useState } from "react";
import { Calendar, Flame, Sparkles, Zap } from "lucide-react";
import { calculateStreak } from "@/lib/domain/streak";
import { triggerHaptic } from "@/lib/services/speech";
import type { Review } from "@/types/lexilo";
import type { WeekDayStat } from "@/types/navigation";
import { UsagiMascot } from "./usagi-mascot";
import { WeeklyRhythmChart } from "./weekly-rhythm-chart";

interface StreakUsagiProps {
  reviews: Review[];
  todayCount: number;
  dueCount: number;
  week: WeekDayStat[];
}

const USAGI_FUN_QUOTES = [
  "YAHA! Usagi đang dõi theo bạn học đó!",
  "Ura! Cố gắng mỗi ngày một chút nhé!",
  "Haa?! Ôn thêm vài thẻ nữa là thành siêu nhân rồi!",
  "Yaha yaha! Học đều đặn để chuỗi lửa cháy mãi nha!",
] as const;

export function StreakUsagi({ reviews, todayCount, dueCount, week }: StreakUsagiProps) {
  const { currentStreak, bestStreak } = useMemo(() => calculateStreak(reviews), [reviews]);
  const [funIndex, setFunIndex] = useState<number | null>(null);

  const baseState = useMemo(() => {
    if (todayCount >= 5) {
      return {
        mood: "cheering" as const,
        speech: "YAHA! Tuyệt đỉnh hôm nay!",
        subtext: `Bạn đã ôn tập ${todayCount} lượt thẻ rồi! Chuỗi ${currentStreak} ngày rực rỡ, Usagi cho bạn điểm 10.`,
      };
    }
    if (todayCount > 0) {
      return {
        mood: "cheering" as const,
        speech: "Ura! Giữ chuỗi thành công!",
        subtext: `Hôm nay bạn đã ôn ${todayCount} thẻ. ${
          dueCount > 0
            ? `Còn ${dueCount} thẻ nữa là hoàn tất mục tiêu!`
            : "Hết thẻ đến hạn rồi, quá xuất sắc!"
        }`,
      };
    }
    if (currentStreak > 0) {
      return {
        mood: "waiting" as const,
        speech: "Haa?! Chuỗi lửa đang chờ bạn!",
        subtext: `Chuỗi ${currentStreak} ngày đang cháy! Ôn ngay ít nhất 1 thẻ hôm nay để không bị đứt chuỗi nhé!`,
      };
    }
    return {
      mood: "waiting" as const,
      speech: "Yaha! Bắt đầu chuỗi ngày mới nào!",
      subtext: `Bạn đang có ${dueCount} thẻ cần ôn. Bắt đầu ngay hôm nay để cùng Usagi thắp sáng chuỗi lửa 1 ngày nhé!`,
    };
  }, [todayCount, dueCount, currentStreak]);

  const speech = funIndex !== null ? USAGI_FUN_QUOTES[funIndex] : baseState.speech;

  function cycleFunQuote() {
    triggerHaptic(12);
    setFunIndex((prev) => (prev === null ? 0 : (prev + 1) % USAGI_FUN_QUOTES.length));
  }

  return (
    <div className="clay-card rounded-[28px] border-orange-200/80 bg-gradient-to-br from-[#fffdf9] via-white to-[#fff6ed] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2e] via-[#ff6b4a] to-[#ffa114] text-white shadow-[0_8px_20px_-4px_rgba(255,107,74,0.45),inset_0_1.5px_0_rgba(255,255,255,0.4)]">
            <Flame className="h-6 w-6 fill-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {currentStreak} Ngày
              </span>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-extrabold text-[#c2410c]">
                {currentStreak > 0 ? "Chuỗi đang cháy" : "Chưa có chuỗi"}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600">
              Kỷ lục cao nhất:{" "}
              <strong className="font-extrabold text-slate-800">{bestStreak} ngày</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-orange-200/70 bg-white px-3.5 py-1.5 shadow-[var(--clay-shadow-soft)]">
          <Calendar className="h-4 w-4 text-[#e04826]" />
          <span className="text-xs font-bold text-slate-700">
            Hôm nay: <span className="font-extrabold text-[#e04826]">{todayCount}</span> lượt ôn
          </span>
        </div>
      </div>

      <div className="my-4 flex flex-col items-center gap-4 rounded-3xl border border-amber-200/70 bg-gradient-to-r from-amber-50/75 via-orange-50/45 to-rose-50/35 p-4 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85)] sm:flex-row">
        <div className="shrink-0">
          <UsagiMascot mood={baseState.mood} onClick={cycleFunQuote} />
        </div>

        <button
          type="button"
          onClick={cycleFunQuote}
          className="tap-press relative flex-1 cursor-pointer rounded-2xl border border-amber-200/90 bg-white p-4 text-left shadow-[var(--clay-shadow-soft)] transition-colors hover:border-amber-400"
          title="Chạm để nghe Usagi nói câu khác!"
        >
          <div className="hidden rotate-45 border-b border-l border-amber-200/90 bg-white sm:absolute sm:top-1/2 sm:-left-2 sm:block sm:h-4 sm:w-4 sm:-translate-y-1/2" />

          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
            <h4 className="font-display text-sm leading-tight font-bold text-slate-900 sm:text-base">
              {speech}
            </h4>
          </div>
          <p className="text-xs leading-relaxed font-medium text-slate-600">{baseState.subtext}</p>
          <div className="mt-2.5 flex items-center justify-end gap-1 text-[11px] font-extrabold text-amber-700">
            <Zap size={12} />
            <span>Chạm Usagi để tương tác</span>
          </div>
        </button>
      </div>

      <WeeklyRhythmChart week={week} />
    </div>
  );
}
