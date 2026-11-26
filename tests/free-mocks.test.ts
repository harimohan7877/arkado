import { describe, expect, it } from "vitest";
import { FREE_MOCKS } from "@/lib/free-mocks";
import { scoreFreeMock } from "@/lib/free-mocks/scoring";

describe("free mock tests", () => {
  it.each(FREE_MOCKS)("provides an answer key and 20 distinct questions for $name", (mock) => {
    expect(mock.questions).toHaveLength(20);
    expect(new Set(mock.questions.map(({ prompt }) => prompt)).size).toBe(20);
    for (const { options, answer, explanation } of mock.questions) {
      expect(new Set(options).size).toBe(4);
      expect(options[answer]).toBeTruthy();
      expect(explanation).toBeTruthy();
    }
    const allCorrect = Object.fromEntries(mock.questions.map(({ answer }, index) => [index, answer]));
    expect(scoreFreeMock(mock, allCorrect)).toEqual({
      correct: 20,
      incorrect: 0,
      unanswered: 0,
      score: mock.correctUnits * 20 / 12,
      maximum: mock.correctUnits * 20 / 12,
    });
  });

  it.each(FREE_MOCKS)("scores wrong and skipped answers separately for $name", (mock) => {
    const [first, second] = mock.questions;
    const result = scoreFreeMock(mock, { 0: first.answer, 1: (second.answer + 1) % 4 });
    expect(result).toMatchObject({ correct: 1, incorrect: 1, unanswered: 18 });
    expect(result.score).toBe((mock.correctUnits - mock.penaltyUnits) / 12);
    expect(scoreFreeMock(mock, {}).score).toBe(0);
  });
});
