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
  "YAHA! Usagi đang dõi theo bạn học đó! ✨",
  "Ura! Cố gắng mỗi ngày một chút nhé! 🌟",
  "Haa?! Ôn thêm vài thẻ nữa là thành siêu nhân rồi! ⚡",
  "Yaha yaha! Học đều đặn để chuỗi lửa cháy mãi nha! 🔥",
] as const;

export function StreakUsagi({ reviews, todayCount, dueCount, week }: StreakUsagiProps) {
  const { currentStreak, bestStreak } = useMemo(() => calculateStreak(reviews), [reviews]);
  const [funIndex, setFunIndex] = useState<number | null>(null);

  const baseState = useMemo(() => {
    if (todayCount >= 5) {
      return {
        mood: "cheering" as const,
        speech: "YAHA! 🔥 Tuyệt đỉnh hôm nay!",
        subtext: `Bạn đã ôn tập ${todayCount} lượt thẻ rồi! Chuỗi ${currentStreak} ngày rực rỡ, Usagi cho bạn điểm 10! ✨`,
      };
    }
    if (todayCount > 0) {
      return {
        mood: "cheering" as const,
        speech: "Ura! Giữ chuỗi thành công! 🌟",
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
        speech: "Haa?! Chuỗi lửa đang chờ bạn! ⚡",
        subtext: `Chuỗi ${currentStreak} ngày đang cháy! Ôn ngay ít nhất 1 thẻ hôm nay để không bị đứt chuỗi nhé!`,
      };
    }
    return {
      mood: "waiting" as const,
      speech: "Yaha! Bắt đầu chuỗi ngày mới nào! 🚀",
      subtext: `Bạn đang có ${dueCount} thẻ cần ôn. Bắt đầu ngay hôm nay để cùng Usagi thắp sáng chuỗi lửa 1 ngày nhé!`,
    };
  }, [todayCount, dueCount, currentStreak]);

  const speech = funIndex !== null ? USAGI_FUN_QUOTES[funIndex] : baseState.speech;

  function cycleFunQuote() {
    triggerHaptic(12);
    setFunIndex((prev) => (prev === null ? 0 : (prev + 1) % USAGI_FUN_QUOTES.length));
  }

  return (
    <div className="rounded-[28px] border border-orange-200/70 bg-gradient-to-br from-[#fffdfa] via-white to-[#fff9f0] p-5 shadow-sm transition-all sm:p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2e] via-[#ff6a3d] to-[#ffa114] text-white shadow-lg shadow-orange-500/30">
            <Flame className="h-6 w-6 animate-pulse fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentStreak} Ngày
              </span>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-[#ff4d2e] dark:bg-orange-950/60 dark:text-orange-300">
                {currentStreak > 0 ? "Chuỗi đang cháy! 🔥" : "Chưa có chuỗi"}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kỷ lục cao nhất:{" "}
              <strong className="font-bold text-slate-700 dark:text-slate-300">
                {bestStreak} ngày
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-white/90 px-3.5 py-1.5 shadow-xs dark:border-slate-700 dark:bg-slate-800/80">
          <Calendar className="h-4 w-4 text-[#ff5e3a]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Hôm nay: <span className="font-black text-[#ff5e3a]">{todayCount}</span> lượt ôn
          </span>
        </div>
      </div>

      <div className="my-4 flex flex-col items-center gap-4 rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-pink-50/30 p-4 sm:flex-row dark:border-slate-700/60 dark:from-slate-800/50 dark:to-slate-800/30">
        <div className="shrink-0">
          <UsagiMascot mood={baseState.mood} onClick={cycleFunQuote} />
        </div>

        <div
          onClick={cycleFunQuote}
          className="tap-press relative flex-1 cursor-pointer rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs transition-colors hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900"
          title="Chạm để nghe Usagi nói câu khác!"
        >
          <div className="hidden rotate-45 border-b border-l border-amber-200/80 bg-white sm:absolute sm:top-1/2 sm:-left-2 sm:block sm:h-4 sm:w-4 sm:-translate-y-1/2 dark:border-slate-700 dark:bg-slate-900" />

          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
            <h4 className="text-sm leading-tight font-black text-slate-900 sm:text-base dark:text-white">
              {speech}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {baseState.subtext}
          </p>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-amber-600 opacity-75 dark:text-amber-400">
            <Zap size={11} />
            <span>Chạm Usagi để tương tác</span>
          </div>
        </div>
      </div>

      <WeeklyRhythmChart week={week} />
    </div>
  );
}
