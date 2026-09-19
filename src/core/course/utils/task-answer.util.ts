export function normalizeTaskAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '');
}

export function taskAnswersMatch(studentAnswer: string, correctAnswer: string): boolean {
  const normalizedCorrectAnswer = normalizeTaskAnswer(correctAnswer);
  return normalizedCorrectAnswer.length > 0 && normalizeTaskAnswer(studentAnswer) === normalizedCorrectAnswer;
}
