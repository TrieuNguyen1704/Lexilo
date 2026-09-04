import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

const domain = await vite.ssrLoadModule("/lib/lexilo.ts");

const cards = [
  { id: "1", deckId: "daily", front: "resilient", ipa: "/rɪˈzɪliənt/", partOfSpeech: "adjective", back: "kiên cường", example: "Example one.", isDifficult: false, due: 1, interval: 0, reps: 0, lapses: 0 },
  { id: "2", deckId: "daily", front: "adapt", ipa: "/əˈdæpt/", partOfSpeech: "verb", back: "thích nghi", example: "Example two.", isDifficult: false, due: 1, interval: 0, reps: 0, lapses: 0 },
  { id: "3", deckId: "daily", front: "steady", ipa: "/ˈstedi/", partOfSpeech: "adjective", back: "ổn định", example: "Example three.", isDifficult: false, due: 1, interval: 0, reps: 0, lapses: 0 },
  { id: "4", deckId: "daily", front: "recover", ipa: "/rɪˈkʌvər/", partOfSpeech: "verb", back: "hồi phục", example: "Example four.", isDifficult: false, due: 1, interval: 0, reps: 0, lapses: 0 },
];

test("parses the five-field quick import and normalizes common parts of speech", () => {
  const [card] = domain.parseQuickImport(
    "resilient | /rɪˈzɪliənt/ | Adj. | kiên cường | She remained resilient after the setback.",
  );
  assert.deepEqual(card, {
    front: "resilient",
    ipa: "/rɪˈzɪliənt/",
    partOfSpeech: "adjective",
    back: "kiên cường",
    example: "She remained resilient after the setback.",
  });
});

test("creates multiple-choice answers with exactly one correct, without duplicates", () => {
  const options = domain.choicesFor(cards[0], cards, "en-vi");
  assert.equal(options.length, 4);
  assert.equal(new Set(options).size, options.length);
  assert.equal(options.filter((option) => domain.normalizeAnswer(option) === "kiên cường").length, 1);
});

test("reduces choices safely for a small deck", () => {
  const options = domain.choicesFor(cards[0], cards.slice(0, 2), "vi-en");
  assert.equal(options.length, 2);
  assert.equal(new Set(options).size, 2);
});

test("compares typed answers without case or extra whitespace", () => {
  assert.equal(domain.normalizeAnswer("  Figure   Out "), domain.normalizeAnswer("figure out"));
});

test("exports the five-column CSV format", () => {
  const csv = domain.cardsToCsv(cards.slice(0, 1));
  assert.match(csv, /^\uFEFFFront,IPA,PartOfSpeech,Back,Example/);
  assert.match(csv, /adjective/);
});
