import type { Review } from "@/types/lexilo";
import type { WeekDayStat } from "@/types/navigation";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

export function todayDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function buildWeeklyRhythm(reviews: Review[], referenceDate = new Date()): WeekDayStat[] {
  const todayKey = todayDateKey(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return {
      label: WEEKDAY_LABELS[date.getDay()],
      count: reviews.filter((review) => review.date === key).length,
      dateStr: key,
      isToday: key === todayKey,
    };
  });
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
      current += 1;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }

  return max;
}

export function calculateStreak(
  reviews: Review[],
  referenceDate = new Date(),
): { currentStreak: number; bestStreak: number } {
  if (!reviews || reviews.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const uniqueDates = Array.from(new Set(reviews.map((r) => r.date))).sort().reverse();
  if (uniqueDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const todayStr = todayDateKey(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = todayDateKey(yesterday);

  let currentStreak = 0;
  let checkDate: Date;

  if (uniqueDates.includes(todayStr)) {
    checkDate = new Date(referenceDate);
  } else if (uniqueDates.includes(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    return { currentStreak: 0, bestStreak: calculateBestStreak(uniqueDates) };
  }

  while (true) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (uniqueDates.includes(dateKey)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, calculateBestStreak(uniqueDates));
  return { currentStreak, bestStreak };
}
