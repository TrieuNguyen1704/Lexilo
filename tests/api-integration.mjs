import assert from "node:assert/strict";
import http from "node:http";

const base = new URL(process.env.LEXILO_TEST_URL || "http://127.0.0.1:5174");

function request(method, pathname, payload) {
  return new Promise((resolve, reject) => {
    const content = payload === undefined ? "" : JSON.stringify(payload);
    const req = http.request({
      hostname: base.hostname,
      port: base.port,
      path: pathname,
      method,
      headers: {
        connection: "close",
        ...(content ? { "content-type": "application/json", "content-length": Buffer.byteLength(content) } : {}),
      },
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        let value;
        try { value = JSON.parse(raw); }
        catch { return reject(new Error(`Invalid JSON (${res.statusCode}): ${raw}`)); }
        if (res.statusCode >= 400) return reject(Object.assign(new Error(value.error), { status: res.statusCode }));
        resolve(value);
      });
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => req.destroy(new Error("API timeout")));
    req.end(content);
  });
}

const before = await request("GET", "/api/state");
const originalBackup = await request("GET", "/api/backup");
const deck = before.decks.find((candidate) => candidate.cardCount > 0) || before.decks[0];
const baselineIds = before.cards.map((card) => card.id).sort();
let testCardId;

try {
  assert.ok(before.cards.every((card) => "partOfSpeech" in card && "isDifficult" in card));
  assert.equal(originalBackup.version, 2);
  assert.ok(originalBackup.cards.every((card) => "partOfSpeech" in card && "isDifficult" in card && "fsrsJson" in card));

  const createdState = await request("POST", "/api/cards", {
    deckId: deck.id,
    cards: [{
      front: "lexilo integration",
      ipa: "/ˈlɛksɪloʊ/",
      partOfSpeech: "Adj.",
      back: "kiểm thử tích hợp",
      example: "Lexilo passed its integration test.",
    }],
  });
  const created = createdState.cards.find((card) => card.front === "lexilo integration");
  assert.ok(created);
  testCardId = created.id;
  assert.equal(created.ipa, "/ˈlɛksɪloʊ/");
  assert.equal(created.partOfSpeech, "adjective");

  const updatedState = await request("PUT", `/api/cards/${testCardId}`, {
    front: "lexilo integration updated",
    ipa: "/ˈlɛksɪloʊ/",
    partOfSpeech: "Phrasal-Verb",
    back: "đã kiểm thử tích hợp",
    example: "The integration card was updated.",
  });
  const updated = updatedState.cards.find((card) => card.id === testCardId);
  assert.equal(updated.partOfSpeech, "phrasal verb");

  const difficultState = await request("PATCH", `/api/cards/${testCardId}`, { isDifficult: true });
  assert.equal(difficultState.cards.find((card) => card.id === testCardId).isDifficult, true);

  const reviewed = await request("POST", "/api/review", { cardId: testCardId, rating: "easy" });
  const dueAfterReview = reviewed.state.cards.find((card) => card.id === testCardId).due;
  assert.ok(dueAfterReview > Date.now());

  const allDeckCards = await request("GET", `/api/decks/${encodeURIComponent(deck.id)}/cards?scope=all`);
  const dueDeckCards = await request("GET", `/api/decks/${encodeURIComponent(deck.id)}/cards?scope=due`);
  assert.ok(allDeckCards.cards.some((card) => card.id === testCardId));
  assert.ok(!dueDeckCards.cards.some((card) => card.id === testCardId));
  const allDeckCardsAgain = await request("GET", `/api/decks/${encodeURIComponent(deck.id)}/cards?scope=all`);
  assert.equal(allDeckCardsAgain.cards.find((card) => card.id === testCardId).due, dueAfterReview);

  // Test Deck CRUD: Create, Update, Delete
  const deckCreatedState = await request("POST", "/api/decks", { name: "Deck Integration Test", color: "#2563eb" });
  const createdDeck = deckCreatedState.decks.find((d) => d.name === "Deck Integration Test");
  assert.ok(createdDeck);
  assert.equal(createdDeck.color, "#2563eb");

  const deckUpdatedState = await request("PUT", `/api/decks/${encodeURIComponent(createdDeck.id)}`, {
    name: "Deck Integration Test Updated",
    color: "#ec4899",
  });
  const updatedDeck = deckUpdatedState.decks.find((d) => d.id === createdDeck.id);
  assert.ok(updatedDeck);
  assert.equal(updatedDeck.name, "Deck Integration Test Updated");
  assert.equal(updatedDeck.color, "#ec4899");

  const deckDeletedState = await request("DELETE", `/api/decks/${encodeURIComponent(createdDeck.id)}`);
  assert.ok(!deckDeletedState.decks.some((d) => d.id === createdDeck.id));

  const batch = await request("POST", "/api/reviews/batch", { results: [{ cardId: testCardId, rating: "good" }] });
  assert.equal(batch.scheduled.length, 1);

  const backupWithCard = await request("GET", "/api/backup");
  const backedUpCard = backupWithCard.cards.find((card) => card.id === testCardId);
  assert.equal(backedUpCard.partOfSpeech, "phrasal verb");
  assert.equal(backedUpCard.isDifficult, true);
  const reviewCountBeforeRestore = backupWithCard.reviews.length;
  await request("POST", "/api/restore", backupWithCard);
  const afterRestore = await request("GET", "/api/backup");
  assert.equal(afterRestore.reviews.length, reviewCountBeforeRestore);
  assert.equal(afterRestore.cards.find((card) => card.id === testCardId).isDifficult, true);

  await request("POST", "/api/restore", {
    decks: [{ id: "legacy", name: "Legacy", color: "#6c63ff" }],
    cards: [{ id: "legacy-card", deckId: "legacy", front: "old", back: "cũ", example: "Old backup." }],
    reviews: [],
  });
  const legacy = await request("GET", "/api/state");
  assert.equal(legacy.cards[0].ipa, "");
  assert.equal(legacy.cards[0].partOfSpeech, "");
  assert.equal(legacy.cards[0].isDifficult, false);

  await request("POST", "/api/restore", originalBackup);
  const finalState = await request("GET", "/api/state");
  assert.deepEqual(finalState.cards.map((card) => card.id).sort(), baselineIds);
  assert.equal(finalState.reviews.length, before.reviews.length);

  const health = await request("GET", "/api/health");
  if (!health.ollama) {
    await assert.rejects(
      request("POST", "/api/ai/generate", { text: "resilience", model: "qwen3.5:2b" }),
      (error) => error.status === 503 && /Ollama/.test(error.message),
    );
  }

  console.log(JSON.stringify({
    migrationFields: true,
    createUpdateDifficult: true,
    freeStudyDoesNotChangeDue: true,
    dueScopeExcludesFutureCard: true,
    fsrsSingleAndBatch: true,
    backupRestoreAndLegacyRestore: true,
    idsAndReviewHistoryPreserved: true,
    ollamaFallback: !health.ollama,
  }, null, 2));
} finally {
  const current = await request("GET", "/api/state").catch(() => null);
  if (current && !baselineIds.every((id) => current.cards.some((card) => card.id === id))) {
    await request("POST", "/api/restore", originalBackup).catch(() => {});
  } else if (testCardId && current?.cards.some((card) => card.id === testCardId)) {
    await request("DELETE", `/api/cards/${testCardId}`).catch(() => {});
  }
}
