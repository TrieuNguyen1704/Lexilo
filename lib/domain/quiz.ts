import type { Card, Direction, DirectionChoice } from "@/types/lexilo";

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function questionFor(card: Card, direction: Direction): string {
  return direction === "en-vi" ? card.front : card.back;
}

export function answerFor(card: Card, direction: Direction): string {
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
