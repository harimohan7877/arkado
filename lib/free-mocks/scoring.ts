export interface FreeMockQuestion {
  topic: string;
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
}

export interface FreeMock {
  id: string;
  name: string;
  group: string;
  minutes: number;
  correctUnits: number;
  penaltyUnits: number;
  penaltyLabel: string;
  catalogue: string;
  questions: FreeMockQuestion[];
}

export function scoreFreeMock(mock: FreeMock, answers: Record<number, number>) {
  let correct = 0;
  let incorrect = 0;
  mock.questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === question.answer) correct++;
    else if (answer !== undefined) incorrect++;
  });

  return {
    correct,
    incorrect,
    unanswered: mock.questions.length - correct - incorrect,
    score: (correct * mock.correctUnits - incorrect * mock.penaltyUnits) / 12,
    maximum: mock.questions.length * mock.correctUnits / 12,
  };
}
