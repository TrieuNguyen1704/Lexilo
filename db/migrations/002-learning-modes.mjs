const additions = [
  ["ipa", "ALTER TABLE cards ADD COLUMN ipa TEXT DEFAULT ''"],
  ["part_of_speech", "ALTER TABLE cards ADD COLUMN part_of_speech TEXT DEFAULT ''"],
  ["is_difficult", "ALTER TABLE cards ADD COLUMN is_difficult INTEGER DEFAULT 0"],
];

export function migrateLearningModes(db) {
  const columns = new Set(
    db.prepare("PRAGMA table_info(cards)").all().map((column) => column.name),
  );

  for (const [name, sql] of additions) {
    if (!columns.has(name)) {
      db.exec(sql);
      columns.add(name);
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id);
    PRAGMA optimize;
  `);
}
