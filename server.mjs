import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createEmptyCard, fsrs, Rating } from "ts-fsrs";
import { migrateLearningModes } from "./db/migrations/002-learning-modes.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const databasePath = process.env.LEXILO_DB_PATH || path.join(dataDirectory, "lexilo.db");
const port = Number(process.env.LEXILO_PORT || 5173);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS decks(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards(
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    ipa TEXT DEFAULT '',
    part_of_speech TEXT DEFAULT '',
    back TEXT NOT NULL,
    example TEXT DEFAULT '',
    is_difficult INTEGER DEFAULT 0,
    fsrs_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviews(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    reviewed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
migrateLearningModes(db);

const COMMON_PARTS_OF_SPEECH = new Map([
  ["n", "noun"],
  ["n.", "noun"],
  ["noun", "noun"],
  ["v", "verb"],
  ["v.", "verb"],
  ["verb", "verb"],
  ["adj", "adjective"],
  ["adj.", "adjective"],
  ["adjective", "adjective"],
  ["adv", "adverb"],
  ["adv.", "adverb"],
  ["adverb", "adverb"],
  ["pron", "pronoun"],
  ["pron.", "pronoun"],
  ["pronoun", "pronoun"],
  ["prep", "preposition"],
  ["prep.", "preposition"],
  ["preposition", "preposition"],
  ["conj", "conjunction"],
  ["conj.", "conjunction"],
  ["conjunction", "conjunction"],
  ["interj", "interjection"],
  ["interj.", "interjection"],
  ["interjection", "interjection"],
  ["phrasal-verb", "phrasal verb"],
  ["phrasal verb", "phrasal verb"],
  ["idiom", "idiom"],
  ["phrase", "phrase"],
]);

function normalizePartOfSpeech(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return COMMON_PARTS_OF_SPEECH.get(normalized) || normalized;
}

function normalizeIpa(value, strict = false) {
  const ipa = String(value ?? "").trim();
  if (!strict || ipa === "" || /^\/[^/\r\n]+\/$/.test(ipa)) return ipa;
  return "";
}

function seedDatabase() {
  if (db.prepare("SELECT 1 FROM decks LIMIT 1").get()) return;
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO decks(id,name,color,created_at) VALUES(?,?,?,?)").run(
    "daily",
    "English hằng ngày",
    "#ff6b4a",
    createdAt,
  );
  const add = db.prepare(`
    INSERT INTO cards(
      id,deck_id,front,ipa,part_of_speech,back,example,is_difficult,fsrs_json,created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?)
  `);
  const samples = [
    ["resilient", "/rɪˈzɪliənt/", "adjective", "kiên cường; có khả năng phục hồi", "She remained resilient after the setback."],
    ["figure out", "/ˈfɪɡər aʊt/", "phrasal verb", "tìm ra; hiểu ra", "I need to figure out how it works."],
  ];
  for (const [front, ipa, partOfSpeech, back, example] of samples) {
    add.run(
      crypto.randomUUID(),
      "daily",
      front,
      ipa,
      partOfSpeech,
      back,
      example,
      0,
      JSON.stringify(createEmptyCard()),
      createdAt,
    );
  }
}
seedDatabase();

const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 36500 });
const ratings = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function sendJson(res, payload, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, error, details) {
  sendJson(res, { error, ...(details ? { details } : {}) }, status);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let content = "";
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) return;
      content += chunk;
      if (content.length > 2_000_000) {
        settled = true;
        reject(new Error("Dữ liệu gửi lên quá lớn"));
      }
    });
    req.on("end", () => {
      if (settled) return;
      try {
        resolve(content ? JSON.parse(content) : {});
      } catch {
        reject(new Error("JSON không hợp lệ"));
      }
    });
    req.on("error", reject);
  });
}

function hydrateFsrs(value) {
  const card = typeof value === "string" ? JSON.parse(value) : structuredClone(value);
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return card;
}

function serializeCard(row) {
  const fsrsCard = JSON.parse(row.fsrs_json);
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    ipa: row.ipa || "",
    partOfSpeech: row.part_of_speech || "",
    back: row.back,
    example: row.example || "",
    isDifficult: Boolean(row.is_difficult),
    due: new Date(fsrsCard.due).getTime(),
    interval: fsrsCard.scheduled_days || 0,
    reps: fsrsCard.reps || 0,
    lapses: fsrsCard.lapses || 0,
  };
}

const cardSelect = `
  SELECT id,deck_id,front,ipa,part_of_speech,back,example,is_difficult,fsrs_json,created_at
  FROM cards
`;

function getState() {
  const now = Date.now();
  const cards = db.prepare(`${cardSelect} ORDER BY created_at`).all().map(serializeCard);
  const decks = db.prepare("SELECT id,name,color FROM decks ORDER BY created_at").all().map((deck) => ({
    ...deck,
    cardCount: cards.filter((card) => card.deckId === deck.id).length,
    dueCount: cards.filter((card) => card.deckId === deck.id && card.due <= now).length,
  }));
  const reviews = db.prepare("SELECT id,card_id,rating,reviewed_at FROM reviews ORDER BY reviewed_at").all().map((review) => ({
    id: review.id,
    cardId: review.card_id,
    rating: review.rating,
    date: String(review.reviewed_at).slice(0, 10),
    reviewedAt: review.reviewed_at,
  }));
  return { decks, cards, reviews };
}

function getDeckCards(deckId, dueOnly = false) {
  const cards = db.prepare(`${cardSelect} WHERE deck_id=? ORDER BY created_at`).all(deckId).map(serializeCard);
  return dueOnly ? cards.filter((card) => card.due <= Date.now()) : cards;
}

function saveReview(cardId, ratingName, reviewedAt = new Date()) {
  const rating = ratings[ratingName];
  if (!rating) throw new Error("Mức đánh giá không hợp lệ");
  const row = db.prepare("SELECT fsrs_json FROM cards WHERE id=?").get(cardId);
  if (!row) throw new Error("Không tìm thấy thẻ");
  const result = scheduler.next(hydrateFsrs(row.fsrs_json), reviewedAt, rating);
  db.prepare("UPDATE cards SET fsrs_json=? WHERE id=?").run(JSON.stringify(result.card), cardId);
  db.prepare("INSERT INTO reviews(card_id,rating,reviewed_at) VALUES(?,?,?)").run(
    cardId,
    rating,
    reviewedAt.toISOString(),
  );
  return result.card;
}

function buildBackup() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    decks: db.prepare("SELECT id,name,color,created_at AS createdAt FROM decks ORDER BY created_at").all(),
    cards: db.prepare(`${cardSelect} ORDER BY created_at`).all().map((card) => ({
      id: card.id,
      deckId: card.deck_id,
      front: card.front,
      ipa: card.ipa || "",
      partOfSpeech: card.part_of_speech || "",
      back: card.back,
      example: card.example || "",
      isDifficult: Boolean(card.is_difficult),
      fsrsJson: card.fsrs_json,
      createdAt: card.created_at,
    })),
    reviews: db.prepare("SELECT id,card_id AS cardId,rating,reviewed_at AS reviewedAt FROM reviews ORDER BY reviewed_at").all(),
    settings: db.prepare("SELECT key,value FROM settings ORDER BY key").all(),
  };
}

function restoreFsrs(card) {
  if (card.fsrsJson) {
    try {
      const parsed = typeof card.fsrsJson === "string" ? JSON.parse(card.fsrsJson) : card.fsrsJson;
      if (parsed && parsed.due) return JSON.stringify(parsed);
    } catch {}
  }
  const restored = createEmptyCard();
  restored.due = new Date(Number(card.due) || Date.now());
  restored.scheduled_days = Number(card.interval) || 0;
  restored.reps = Number(card.reps) || 0;
  restored.lapses = Number(card.lapses) || 0;
  return JSON.stringify(restored);
}

function restoreBackup(backup) {
  if (!Array.isArray(backup.decks) || !Array.isArray(backup.cards)) {
    throw new Error("File sao lưu không hợp lệ");
  }
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM reviews; DELETE FROM cards; DELETE FROM decks;");
    const addDeck = db.prepare("INSERT INTO decks(id,name,color,created_at) VALUES(?,?,?,?)");
    const addCard = db.prepare(`
      INSERT INTO cards(
        id,deck_id,front,ipa,part_of_speech,back,example,is_difficult,fsrs_json,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?)
    `);
    const addReview = db.prepare("INSERT INTO reviews(id,card_id,rating,reviewed_at) VALUES(?,?,?,?)");
    const addReviewWithoutId = db.prepare("INSERT INTO reviews(card_id,rating,reviewed_at) VALUES(?,?,?)");

    for (const deck of backup.decks) {
      addDeck.run(
        String(deck.id || crypto.randomUUID()),
        String(deck.name || "Bộ thẻ"),
        String(deck.color || "#6c63ff"),
        String(deck.createdAt || new Date().toISOString()),
      );
    }
    const restoredCardIds = new Set();
    for (const card of backup.cards) {
      const id = String(card.id || crypto.randomUUID());
      restoredCardIds.add(id);
      addCard.run(
        id,
        String(card.deckId),
        String(card.front || ""),
        normalizeIpa(card.ipa),
        normalizePartOfSpeech(card.partOfSpeech),
        String(card.back || ""),
        String(card.example || ""),
        card.isDifficult ? 1 : 0,
        restoreFsrs(card),
        String(card.createdAt || new Date().toISOString()),
      );
    }
    for (const review of Array.isArray(backup.reviews) ? backup.reviews : []) {
      if (!review.cardId || !restoredCardIds.has(String(review.cardId))) continue;
      const reviewedAt = String(review.reviewedAt || review.date || new Date().toISOString());
      if (Number.isInteger(Number(review.id))) {
        addReview.run(Number(review.id), String(review.cardId), Number(review.rating), reviewedAt);
      } else {
        addReviewWithoutId.run(String(review.cardId), Number(review.rating), reviewedAt);
      }
    }
    if (Array.isArray(backup.settings)) {
      db.exec("DELETE FROM settings");
      const addSetting = db.prepare("INSERT INTO settings(key,value) VALUES(?,?)");
      for (const setting of backup.settings) addSetting.run(String(setting.key), String(setting.value));
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function normalizeAiCard(card) {
  const front = typeof card?.front === "string" ? card.front.trim() : "";
  const back = typeof card?.back === "string" ? card.back.trim() : "";
  return {
    front,
    ipa: normalizeIpa(card?.ipa, true),
    partOfSpeech: normalizePartOfSpeech(card?.partOfSpeech),
    back,
    example: typeof card?.example === "string" ? card.example.trim() : "",
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    return sendJson(res, getState());
  }
  if (req.method === "GET" && url.pathname === "/api/backup") {
    return sendJson(res, buildBackup());
  }
  if (req.method === "GET" && url.pathname === "/api/health") {
    let ollama = false;
    try {
      ollama = (await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(1200) })).ok;
    } catch {}
    return sendJson(res, {
      database: true,
      ollama,
      model: db.prepare("SELECT value FROM settings WHERE key='model'").get()?.value || "qwen3.5:2b",
    });
  }

  const deckCardsMatch = url.pathname.match(/^\/api\/decks\/([^/]+)\/cards$/);
  if (req.method === "GET" && deckCardsMatch) {
    const deckId = decodeURIComponent(deckCardsMatch[1]);
    const deck = db.prepare("SELECT id,name,color FROM decks WHERE id=?").get(deckId);
    if (!deck) return sendError(res, 404, "Không tìm thấy bộ thẻ");
    const scope = url.searchParams.get("scope") === "due" ? "due" : "all";
    return sendJson(res, { deck, scope, cards: getDeckCards(deckId, scope === "due") });
  }

  const deckMatch = url.pathname.match(/^\/api\/decks\/([^/]+)$/);
  if (deckMatch && req.method === "PUT") {
    const payload = await readBody(req);
    const name = String(payload.name || "").trim();
    if (!name) return sendError(res, 400, "Tên bộ thẻ không hợp lệ");
    const deckId = decodeURIComponent(deckMatch[1]);
    const existing = db.prepare("SELECT id, color FROM decks WHERE id=?").get(deckId);
    if (!existing) return sendError(res, 404, "Không tìm thấy bộ thẻ");
    const color = String(payload.color || existing.color || "#ff6b4a").trim();
    db.prepare("UPDATE decks SET name=?, color=? WHERE id=?").run(name, color, deckId);
    return sendJson(res, getState());
  }

  if (deckMatch && req.method === "DELETE") {
    const deckId = decodeURIComponent(deckMatch[1]);
    const existing = db.prepare("SELECT 1 FROM decks WHERE id=?").get(deckId);
    if (!existing) return sendError(res, 404, "Không tìm thấy bộ thẻ");
    const totalDecks = db.prepare("SELECT count(*) as count FROM decks").get().count;
    if (totalDecks <= 1) {
      return sendError(res, 400, "Không thể xóa bộ thẻ duy nhất còn lại. Hãy tạo bộ thẻ mới trước khi xóa.");
    }
    db.prepare("DELETE FROM decks WHERE id=?").run(deckId);
    return sendJson(res, getState());
  }

  if (req.method === "POST" && url.pathname === "/api/decks") {
    const payload = await readBody(req);
    const name = String(payload.name || "").trim();
    if (!name) return sendError(res, 400, "Tên bộ thẻ không hợp lệ");
    const colors = ["#ff6b4a", "#6c63ff", "#17a673", "#e9a11b", "#2563eb", "#ec4899", "#0d9488"];
    const count = db.prepare("SELECT count(*) AS n FROM decks").get().n;
    const color = String(payload.color || colors[Number(count) % colors.length]).trim();
    db.prepare("INSERT INTO decks(id,name,color,created_at) VALUES(?,?,?,?)").run(
      crypto.randomUUID(),
      name,
      color,
      new Date().toISOString(),
    );
    return sendJson(res, getState(), 201);
  }

  if (req.method === "POST" && url.pathname === "/api/cards") {
    const payload = await readBody(req);
    if (!db.prepare("SELECT 1 FROM decks WHERE id=?").get(payload.deckId)) {
      return sendError(res, 400, "Bộ thẻ không hợp lệ");
    }
    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    const add = db.prepare(`
      INSERT INTO cards(
        id,deck_id,front,ipa,part_of_speech,back,example,is_difficult,fsrs_json,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?)
    `);
    let inserted = 0;
    db.exec("BEGIN");
    try {
      for (const card of cards) {
        const front = String(card?.front || "").trim();
        const back = String(card?.back || "").trim();
        if (!front || !back) continue;
        add.run(
          crypto.randomUUID(),
          String(payload.deckId),
          front,
          normalizeIpa(card.ipa),
          normalizePartOfSpeech(card.partOfSpeech),
          back,
          String(card.example || "").trim(),
          card.isDifficult ? 1 : 0,
          JSON.stringify(createEmptyCard()),
          new Date().toISOString(),
        );
        inserted += 1;
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    if (!inserted) return sendError(res, 400, "Không có thẻ hợp lệ để lưu");
    return sendJson(res, getState(), 201);
  }

  if (req.method === "POST" && url.pathname === "/api/restore") {
    const payload = await readBody(req);
    restoreBackup(payload);
    return sendJson(res, getState());
  }

  const cardMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
  if (cardMatch && req.method === "PUT") {
    const payload = await readBody(req);
    const front = String(payload.front || "").trim();
    const back = String(payload.back || "").trim();
    if (!front || !back) return sendError(res, 400, "Front và Back không được để trống");
    const result = db.prepare(`
      UPDATE cards
      SET front=?,ipa=?,part_of_speech=?,back=?,example=?
      WHERE id=?
    `).run(
      front,
      normalizeIpa(payload.ipa),
      normalizePartOfSpeech(payload.partOfSpeech),
      back,
      String(payload.example || "").trim(),
      decodeURIComponent(cardMatch[1]),
    );
    if (!result.changes) return sendError(res, 404, "Không tìm thấy thẻ");
    return sendJson(res, getState());
  }
  if (cardMatch && req.method === "PATCH") {
    const payload = await readBody(req);
    const cardId = decodeURIComponent(cardMatch[1]);
    const result = db.prepare("UPDATE cards SET is_difficult=? WHERE id=?").run(payload.isDifficult ? 1 : 0, cardId);
    if (!result.changes) return sendError(res, 404, "Không tìm thấy thẻ");
    return sendJson(res, getState());
  }
  if (cardMatch && req.method === "DELETE") {
    const result = db.prepare("DELETE FROM cards WHERE id=?").run(decodeURIComponent(cardMatch[1]));
    if (!result.changes) return sendError(res, 404, "Không tìm thấy thẻ");
    return sendJson(res, getState());
  }

  if (req.method === "POST" && url.pathname === "/api/review") {
    const payload = await readBody(req);
    try {
      const card = saveReview(String(payload.cardId), payload.rating);
      return sendJson(res, { state: getState(), card });
    } catch (error) {
      return sendError(res, error.message === "Không tìm thấy thẻ" ? 404 : 400, error.message);
    }
  }
  if (req.method === "POST" && url.pathname === "/api/reviews/batch") {
    const payload = await readBody(req);
    const results = Array.isArray(payload.results) ? payload.results : [];
    if (!results.length) return sendError(res, 400, "Không có kết quả để ghi vào FSRS");
    db.exec("BEGIN");
    try {
      const scheduled = results.map((result) => ({
        cardId: String(result.cardId),
        card: saveReview(String(result.cardId), result.rating),
      }));
      db.exec("COMMIT");
      return sendJson(res, { state: getState(), scheduled });
    } catch (error) {
      db.exec("ROLLBACK");
      return sendError(res, 400, error.message);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/generate") {
    const payload = await readBody(req);
    const model = String(payload.model || "qwen3.5:2b");
    const input = String(payload.text || "").slice(0, 12000);
    if (!input.trim()) return sendError(res, 400, "Anh chưa nhập nội dung");
    const prompt = `You create English flashcards for a Vietnamese A2-B1 learner. Return ONLY a JSON array of 5-20 useful cards. Every item must use this schema: {"front":"useful English word or phrase","ipa":"standard IPA enclosed in / /, or empty string","partOfSpeech":"lowercase English part of speech, or empty string","back":"concise Vietnamese meaning","example":"natural A2-B1 English example"}. Use lowercase for partOfSpeech. Missing values must be empty strings. No markdown. Input:\n${input}`;
    let response;
    try {
      response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
        signal: AbortSignal.timeout(180000),
      });
    } catch {
      return sendError(res, 503, "Chưa kết nối được Ollama. Hãy mở Ollama rồi thử lại.");
    }
    if (!response.ok) return sendError(res, 503, `Ollama chưa có model ${model}`);
    let cards;
    try {
      const raw = (await response.json()).response;
      const parsed = JSON.parse(raw);
      cards = Array.isArray(parsed) ? parsed : parsed.cards || parsed.flashcards;
      if (!Array.isArray(cards)) throw new Error("Expected an array");
    } catch {
      return sendError(res, 502, "AI trả về dữ liệu chưa đúng định dạng");
    }
    const normalized = cards.map(normalizeAiCard).filter((card) => card.front && card.back).slice(0, 30);
    if (!normalized.length) return sendError(res, 502, "AI không tạo được thẻ hợp lệ");
    return sendJson(res, { cards: normalized });
  }

  return false;
}

const dev = process.argv.includes("--dev");
const vite = dev
  ? await import("vite").then((module) => module.createServer({ server: { middlewareMode: true }, appType: "spa" }))
  : null;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (handled !== false) return;
      return sendError(res, 404, "API không tồn tại");
    }
    if (vite) return vite.middlewares(req, res, () => sendError(res, 404, "Không tìm thấy trang"));
    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const file = path.join(root, "dist", requested);
    const distRoot = path.join(root, "dist");
    const safe = file.startsWith(distRoot);
    const target = safe && fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(distRoot, "index.html");
    res.writeHead(200, { "content-type": target.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  } catch (error) {
    console.error(error);
    const clientError = error.message === "JSON không hợp lệ" || error.message === "Dữ liệu gửi lên quá lớn";
    if (!res.headersSent) sendError(res, clientError ? 400 : 500, error.message || "Lỗi máy chủ");
    else res.end();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\n  Lexilo đang chạy tại http://localhost:${port}\n`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
