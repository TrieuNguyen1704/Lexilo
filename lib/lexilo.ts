export type Rating = "again" | "hard" | "good" | "easy";
export type Direction = "en-vi" | "vi-en";
export type DirectionChoice = Direction | "both";
export type QuestionKind = "multiple-choice" | "typing";

export type Card = {
  id: string;
  deckId: string;
  front: string;
  ipa: string;
  partOfSpeech: string;
  back: string;
  example: string;
  isDifficult: boolean;
  due: number;
  interval: number;
  reps: number;
  lapses: number;
};

export type CardDraft = Pick<Card, "front" | "ipa" | "partOfSpeech" | "back" | "example">;

export type Deck = {
  id: string;
  name: string;
  color: string;
  cardCount?: number;
  dueCount?: number;
};

export type Review = {
  id?: number;
  cardId?: string;
  date: string;
  reviewedAt?: string;
  rating: Rating | number;
};

export type Store = {
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
};

export const PART_OF_SPEECH_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrasal verb",
  "idiom",
  "phrase",
] as const;

const partOfSpeechAliases: Record<string, string> = {
  n: "noun",
  "n.": "noun",
  v: "verb",
  "v.": "verb",
  adj: "adjective",
  "adj.": "adjective",
  adv: "adverb",
  "adv.": "adverb",
  pron: "pronoun",
  "pron.": "pronoun",
  prep: "preposition",
  "prep.": "preposition",
  conj: "conjunction",
  "conj.": "conjunction",
  interj: "interjection",
  "interj.": "interjection",
  "phrasal-verb": "phrasal verb",
};

export function normalizePartOfSpeech(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return partOfSpeechAliases[normalized] || normalized;
}

export function emptyDraft(): CardDraft {
  return { front: "", ipa: "", partOfSpeech: "", back: "", example: "" };
}

export function parseQuickImport(text: string): CardDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("\t") ? "\t" : "|";
      const fields = line.split(separator);
      return {
        front: fields[0]?.trim() || "",
        ipa: fields[1]?.trim() || "",
        partOfSpeech: normalizePartOfSpeech(fields[2]),
        back: fields[3]?.trim() || "",
        example: fields.slice(4).join(separator).trim(),
      };
    })
    .filter((card) => card.front && card.back);
}

export function createClozes(text: string): CardDraft[] {
  const stopWords = new Set(
    "about after again also because been before being between could every from have into just more most other over some such than that their them then there these they this those through under very what when where which while will with would your".split(" "),
  );
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 5)
    .slice(0, 30)
    .map((sentence) => {
      const words = sentence.match(/[A-Za-z][A-Za-z'-]{4,}/g) || [];
      const word = words
        .filter((candidate) => !stopWords.has(candidate.toLowerCase()))
        .sort((a, b) => b.length - a.length)[0];
      return word
        ? {
            front: sentence.replace(new RegExp(`\\b${word}\\b`, "i"), "_____"),
            ipa: "",
            partOfSpeech: "",
            back: word,
            example: sentence,
          }
        : null;
    })
    .filter((card): card is CardDraft => Boolean(card));
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function questionFor(card: Card, direction: Direction) {
  return direction === "en-vi" ? card.front : card.back;
}

export function answerFor(card: Card, direction: Direction) {
  return direction === "en-vi" ? card.back : card.front;
}

export function choicesFor(card: Card, deckCards: Card[], direction: Direction): string[] {
  const correct = answerFor(card, direction);
  const distractors = Array.from(
    new Set(
      deckCards
        .filter((candidate) => candidate.id !== card.id)
        .map((candidate) => answerFor(candidate, direction).trim())
        .filter((answer) => answer && normalizeAnswer(answer) !== normalizeAnswer(correct)),
    ),
  );
  return shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
}

export function resolveDirection(choice: DirectionChoice, index: number): Direction {
  return choice === "both" ? (index % 2 === 0 ? "en-vi" : "vi-en") : choice;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function cardsToCsv(cards: Card[]) {
  return `\ufeffFront,IPA,PartOfSpeech,Back,Example\n${cards
    .map((card) => [card.front, card.ipa, card.partOfSpeech, card.back, card.example].map(csvCell).join(","))
    .join("\n")}`;
}
