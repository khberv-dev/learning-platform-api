import { normalizeTaskAnswer, taskAnswersMatch } from '@/core/course/utils/task-answer.util';

describe('task answer normalization', () => {
  it('ignores case, spaces, punctuation, and other non-letter characters', () => {
    expect(taskAnswersMatch('  HELLO, world?!  ', 'hello world')).toBe(true);
    expect(taskAnswersMatch("O'QITUVCHI", 'oqituvchi.')).toBe(true);
    expect(taskAnswersMatch('Salom-123', 'S A L O M')).toBe(true);
  });

  it('keeps Unicode letters', () => {
    expect(normalizeTaskAnswer('Ўзбекистон — Ватан!')).toBe('ўзбекистонватан');
    expect(taskAnswersMatch('ЎЗБЕКИСТОН!', 'ўзбекистон')).toBe(true);
  });

  it('does not treat two answers without letters as correct', () => {
    expect(taskAnswersMatch('...', '?!')).toBe(false);
    expect(taskAnswersMatch('', '   ')).toBe(false);
  });

  it('still rejects different words', () => {
    expect(taskAnswersMatch('hello world', 'hello there')).toBe(false);
  });
});
