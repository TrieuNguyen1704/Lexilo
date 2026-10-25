"use client";

import { useMemo, useState } from "react";
import { Flame, Sparkles, Calendar, Zap } from "lucide-react";
import { Review } from "@/lib/lexilo";

interface StreakUsagiProps {
  reviews: Review[];
  todayCount: number;
  dueCount: number;
  week: { label: string; count: number; dateStr: string; isToday: boolean }[];
}

// Calculate real consecutive days streak from review history
export function calculateStreak(reviews: Review[]): { currentStreak: number; bestStreak: number } {
  if (!reviews || reviews.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Get unique sorted dates in descending order (YYYY-MM-DD)
  const uniqueDates = Array.from(new Set(reviews.map((r) => r.date))).sort().reverse();
  if (uniqueDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let currentStreak = 0;
  let checkDate = new Date();

  // If user reviewed today, streak starts from today
  // If not, check if they reviewed yesterday to keep streak alive
  if (uniqueDates.includes(todayStr)) {
    checkDate = new Date();
  } else if (uniqueDates.includes(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    return { currentStreak: 0, bestStreak: calculateBestStreak(uniqueDates) };
  }

  while (true) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (uniqueDates.includes(dateKey)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, calculateBestStreak(uniqueDates));
  return { currentStreak, bestStreak };
}

function calculateBestStreak(sortedDescDates: string[]): number {
  if (!sortedDescDates.length) return 0;
  let max = 1;
  let current = 1;

  for (let i = 0; i < sortedDescDates.length - 1; i++) {
    const curr = new Date(sortedDescDates[i]);
    const next = new Date(sortedDescDates[i + 1]);
    const diffDays = Math.round((curr.getTime() - next.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }

  return max;
}

const FUN_QUOTES = [
  "YAHA! Usagi đang dõi theo bạn học đó! ✨",
  "Ura! Cố gắng mỗi ngày một chút nhé! 🌟",
  "Haa?! Ôn thêm vài thẻ nữa là thành siêu nhân rồi! ⚡",
  "Yaha yaha! Học đều đặn để chuỗi lửa cháy mãi nha! 🔥",
];

// Authentic Usagi Mascot Component using user's official artwork
function UsagiMascot({ mood, onClick }: { mood: "cheering" | "happy" | "waiting"; onClick?: () => void }) {
  const isCheering = mood === "cheering";
  const imageSrc = isCheering ? "/usagi-cheer.png" : "/usagi-jump.png";

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center select-none group cursor-pointer tap-press"
      title="Bấm vào Usagi để nghe lời nhắn!"
    >
      {/* Dynamic ambient halo glow */}
      <div
        className={`absolute -inset-3 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isCheering
            ? "bg-amber-300/80 dark:bg-amber-500/30 opacity-90 animate-pulse"
            : "bg-orange-200/60 dark:bg-orange-500/20 opacity-70 group-hover:opacity-100"
        }`}
      />

      {/* Usagi Authentic Character */}
      <div
        className={`relative transition-all duration-300 group-hover:scale-110 ${
          isCheering ? "animate-bounce" : "hover:-translate-y-1.5"
        }`}
      >
        <img
          src={imageSrc}
          alt={isCheering ? "Usagi Thumbs Up Cổ Vũ" : "Usagi Nhảy Múa"}
          className={`object-contain drop-shadow-lg select-none pointer-events-none transition-all duration-300 ${
            isCheering ? "w-28 h-28 sm:w-32 sm:h-32" : "w-24 h-24 sm:w-28 sm:h-28"
          }`}
        />
      </div>
    </div>
  );
}

export function StreakUsagi({ reviews, todayCount, dueCount, week }: StreakUsagiProps) {
  const { currentStreak, bestStreak } = useMemo(() => calculateStreak(reviews), [reviews]);
  const [funIndex, setFunIndex] = useState<number | null>(null);

  // Usagi's current mood and dialogue
  const baseSpeech = useMemo(() => {
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
        subtext: `Hôm nay bạn đã ôn ${todayCount} thẻ. ${dueCount > 0 ? `Còn ${dueCount} thẻ nữa là hoàn tất mục tiêu!` : "Hết thẻ đến hạn rồi, quá xuất sắc!"}`,
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

  const speech = funIndex !== null ? FUN_QUOTES[funIndex] : baseSpeech.speech;
  const mood = baseSpeech.mood;
  const subtext = baseSpeech.subtext;

  function cycleFunQuote() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(12); } catch {}
    }
    setFunIndex((prev) => (prev === null ? 0 : (prev + 1) % FUN_QUOTES.length));
  }

  // Find max count for scaling week bars
  const maxWeekCount = Math.max(1, ...week.map((w) => w.count));

  return (
    <div className="rounded-[28px] border border-orange-200/70 bg-gradient-to-br from-[#fffdfa] via-white to-[#fff9f0] p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-all">
      {/* Top Header: Streak Flame & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orange-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff4d2e] via-[#ff6a3d] to-[#ffa114] text-white shadow-lg shadow-orange-500/30">
            <Flame className="w-6 h-6 animate-pulse fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentStreak} Ngày
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ff4d2e] dark:bg-orange-950/60 dark:text-orange-300">
                {currentStreak > 0 ? "Chuỗi đang cháy! 🔥" : "Chưa có chuỗi"}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kỷ lục cao nhất: <strong className="text-slate-700 dark:text-slate-300 font-bold">{bestStreak} ngày</strong>
            </p>
          </div>
        </div>

        {/* Daily Goal badge */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-orange-100 dark:border-slate-700 shadow-xs">
          <Calendar className="w-4 h-4 text-[#ff5e3a]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Hôm nay: <span className="text-[#ff5e3a] font-black">{todayCount}</span> lượt ôn
          </span>
        </div>
      </div>

      {/* Middle Section: Authentic Usagi Mascot & Speech Bubble */}
      <div className="my-4 flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-pink-50/30 dark:from-slate-800/50 dark:to-slate-800/30 p-4 rounded-2xl border border-amber-200/50 dark:border-slate-700/60">
        <div className="shrink-0">
          <UsagiMascot mood={mood} onClick={cycleFunQuote} />
        </div>

        {/* Speech Bubble */}
        <div
          onClick={cycleFunQuote}
          className="relative flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-slate-700 shadow-xs cursor-pointer hover:border-amber-400 transition-colors tap-press"
          title="Chạm để nghe Usagi nói câu khác!"
        >
          {/* Bubble Pointer on desktop */}
          <div className="hidden sm:block absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-l border-b border-amber-200/80 dark:border-slate-700 rotate-45" />

          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
              {speech}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {subtext}
          </p>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 opacity-75">
            <Zap size={11} />
            <span>Chạm Usagi để tương tác</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: 7-Day Rhythm Chart */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Nhịp học 7 ngày qua
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {week.filter((w) => w.count > 0).length}/7 ngày hoạt động
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1 pb-1">
          {week.map((day, idx) => {
            const hasLearned = day.count > 0;
            const barHeightPercent = Math.max(14, Math.min(100, Math.round((day.count / maxWeekCount) * 100)));

            return (
              <div
                key={idx}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                  day.isToday
                    ? "bg-orange-100/70 dark:bg-orange-950/50 ring-2 ring-[#ff5e3a]/40 shadow-xs"
                    : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                }`}
              >
                {/* Count badge on top of bar */}
                <span
                  className={`text-[10px] font-black ${
                    hasLearned ? "text-[#ff5e3a]" : "text-slate-300 dark:text-slate-600"
                  }`}
                >
                  {hasLearned ? `${day.count}` : "-"}
                </span>

                {/* Vertical Bar */}
                <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-md transition-all duration-700 ${
                      hasLearned
                        ? day.isToday
                          ? "bg-gradient-to-t from-[#ff4d2e] to-[#ff9800] shadow-xs"
                          : "bg-gradient-to-t from-[#6366f1] to-[#818cf8]"
                        : "bg-transparent"
                    }`}
                    style={{ height: hasLearned ? `${barHeightPercent}%` : "0%" }}
                  />
                </div>

                {/* Day label */}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-[11px] font-black ${
                      day.isToday
                        ? "text-[#ff5e3a]"
                        : hasLearned
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {day.label}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] font-extrabold text-[#ff5e3a] leading-none uppercase">
                      Nay
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
