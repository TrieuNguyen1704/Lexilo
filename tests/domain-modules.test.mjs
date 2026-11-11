import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

const streak = await vite.ssrLoadModule("/lib/domain/streak.ts");
const cardsDomain = await vite.ssrLoadModule("/lib/domain/cards.ts");
const fsrsDomain = await vite.ssrLoadModule("/lib/domain/fsrs.ts");
const geminiService = await vite.ssrLoadModule("/lib/services/gemini.ts");
const quizDomain = await vite.ssrLoadModule("/lib/domain/quiz.ts");

test("calculates consecutive streak across days including yesterday fallback", () => {
  const ref = new Date("2026-11-12T10:00:00.000Z");
  const reviews = [
    { cardId: "1", date: "2026-11-11", rating: "good" },
    { cardId: "1", date: "2026-11-10", rating: "good" },
    { cardId: "1", date: "2026-11-09", rating: "easy" },
    { cardId: "1", date: "2026-11-05", rating: "good" },
  ];

  const stats = streak.calculateStreak(reviews, ref);
  assert.deepEqual(stats, { currentStreak: 3, bestStreak: 3 });
});

test("builds 7-day weekly rhythm stats ending on reference date", () => {
  const ref = new Date("2026-11-12T10:00:00.000Z");
  const reviews = [
    { cardId: "1", date: "2026-11-12", rating: "good" },
    { cardId: "2", date: "2026-11-12", rating: "easy" },
    { cardId: "1", date: "2026-11-06", rating: "hard" },
  ];

  const week = streak.buildWeeklyRhythm(reviews, ref);
  assert.equal(week.length, 7);
  assert.equal(week[0].dateStr, "2026-11-06");
  assert.equal(week[0].count, 1);
  assert.equal(week[6].dateStr, "2026-11-12");
  assert.equal(week[6].count, 2);
  assert.equal(week[6].isToday, true);
});

test("computes deck stats and filters cards by scope and search query", () => {
  const now = 1_000_000;
  const decks = [
    { id: "d1", name: "Daily", color: "#ff6b4a" },
    { id: "d2", name: "IELTS", color: "#6c63ff" },
  ];
  const cards = [
    { id: "c1", deckId: "d1", front: "resilient", ipa: "", partOfSpeech: "adjective", back: "kiên cường", example: "She is resilient", isDifficult: true, due: now - 10, interval: 0, reps: 0, lapses: 0 },
    { id: "c2", deckId: "d1", front: "adapt", ipa: "", partOfSpeech: "verb", back: "thích nghi", example: "Adapt quickly", isDifficult: false, due: now + 5000, interval: 1, reps: 1, lapses: 0 },
    { id: "c3", deckId: "d2", front: "mitigate", ipa: "", partOfSpeech: "verb", back: "giảm thiểu", example: "Mitigate risk", isDifficult: true, due: now, interval: 0, reps: 0, lapses: 0 },
  ];

  const stats = cardsDomain.computeDeckStatsMap(decks, cards, now);
  assert.deepEqual(stats.get("d1"), { total: 2, due: 1, hard: 1 });
  assert.deepEqual(stats.get("d2"), { total: 1, due: 1, hard: 1 });

  const dueOnly = cardsDomain.filterCards(cards, { deckId: "d1", scope: "due", now });
  assert.deepEqual(dueOnly.map((c) => c.id), ["c1"]);

  const searchHard = cardsDomain.filterCards(cards, { scope: "hard", search: "miti", now });
  assert.deepEqual(searchHard.map((c) => c.id), ["c3"]);
});

test("schedules card review cleanly using ts-fsrs Grade mapping", () => {
  const reviewedAt = new Date("2026-11-12T10:00:00.000Z");
  const card = {
    id: "c1",
    deckId: "d1",
    front: "crucial",
    ipa: "/ˈkruːʃəl/",
    partOfSpeech: "adjective",
    back: "cốt yếu",
    example: "",
    isDifficult: false,
    due: reviewedAt.getTime(),
    interval: 0,
    reps: 0,
    lapses: 0,
  };

  const { updatedCard, review } = fsrsDomain.scheduleCardReview(card, "good", reviewedAt);
  assert.equal(updatedCard.reps, 1);
  assert.ok(updatedCard.due > reviewedAt.getTime());
  assert.equal(review.cardId, "c1");
  assert.equal(review.date, "2026-11-12");
  assert.equal(review.rating, "good");
});

test("extracts JSON cleanly from fenced Gemini responses and defaults to gemini-3.5-flash", () => {
  const fenced = "```json\n{\"isCorrect\": true, \"feedback\": \"Chuẩn rồi!\"}\n```";
  const parsed = geminiService.extractJsonFromGeminiText(fenced);
  assert.deepEqual(parsed, { isCorrect: true, feedback: "Chuẩn rồi!" });

  const cfg = geminiService.getGeminiConfig();
  assert.equal(cfg.model, "gemini-3.5-flash");
  assert.equal(cfg.enabled, false);
});

test("matches meaning variants separated by commas, semicolons, slashes, or punctuation", () => {
  const expected = "nhờ vả, yêu cầu ai đó làm việc gì";
  assert.equal(quizDomain.isLocalFlexibleMatch("nhờ vả", expected), true);
  assert.equal(quizDomain.isLocalFlexibleMatch("yêu cầu ai đó làm việc gì.", expected), true);
  assert.equal(quizDomain.isLocalFlexibleMatch("sai nghĩa", expected), false);
});
