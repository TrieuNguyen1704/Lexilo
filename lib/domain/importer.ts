import type { Card, CardDraft } from "@/types/lexilo";
import { normalizePartOfSpeech } from "./cards";

const CLOZE_STOP_WORDS = new Set(
  "about after again also because been before being between could every from have into just more most other over some such than that their them then there these they this those through under very what when where which while will with would your".split(" "),
);

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
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 5)
    .slice(0, 30)
    .map((sentence) => {
      const words = sentence.match(/[A-Za-z][A-Za-z'-]{4,}/g) || [];
      const word = words
        .filter((candidate) => !CLOZE_STOP_WORDS.has(candidate.toLowerCase()))
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

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function cardsToCsv(cards: Card[]): string {
  return `\ufeffFront,IPA,PartOfSpeech,Back,Example\n${cards
    .map((card) =>
      [card.front, card.ipa, card.partOfSpeech, card.back, card.example]
        .map(escapeCsvCell)
        .join(","),
    )
    .join("\n")}`;
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
