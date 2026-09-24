import { NotFoundException } from '@nestjs/common';

import { TaskSubmissionService } from '@/core/course/services/task-submission.service';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

describe('TaskSubmissionService.getTaskResult', () => {
  const submissionRepo = { findOne: jest.fn() };
  const taskRepo = { findOne: jest.fn() };
  const studentRepo = { findOne: jest.fn() };
  const enrollmentRepo = { findOne: jest.fn() };
  const service = new TaskSubmissionService(
    submissionRepo as never,
    taskRepo as never,
    {} as never,
    studentRepo as never,
    enrollmentRepo as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    studentRepo.findOne.mockResolvedValue({ id: 'student-1' });
    taskRepo.findOne.mockResolvedValue({
      id: 'task-1',
      name: 'Vocabulary',
      file: null,
      contentType: null,
      lesson: { id: 'lesson-1' },
      questions: [
        { question: 'Choose a letter', options: ['A', 'B'], answer: 'a' },
        { question: 'Write a word', options: null, answer: 'hello' },
        { question: 'Unanswered', options: null, answer: 'value' },
      ],
    });
    enrollmentRepo.findOne.mockResolvedValue({
      status: EnrollmentStatus.ACTIVE,
      end: new Date('2099-01-01T00:00:00Z'),
    });
  });

  it('reveals the correct answer only for questions the student got right', async () => {
    const submittedAt = new Date('2026-09-04T12:00:00Z');
    submissionRepo.findOne.mockResolvedValue({
      answer: JSON.stringify(['a', 'world']),
      isCorrect: false,
      coinsEarned: 0,
      createdAt: submittedAt,
    });

    const result = await service.getTaskResult('user-1', 'task-1');

    expect(result).toEqual({
      taskId: 'task-1',
      name: 'Vocabulary',
      file: null,
      contentType: null,
      questions: [
        { question: 'Choose a letter', options: ['A', 'B'], studentAnswer: 'a', isCorrect: true, answer: 'a' },
        { question: 'Write a word', options: null, studentAnswer: 'world', isCorrect: false, answer: null },
        { question: 'Unanswered', options: null, studentAnswer: null, isCorrect: false, answer: null },
      ],
      isCorrect: false,
      coinsEarned: 0,
      submittedAt,
    });
    expect(submissionRepo.findOne).toHaveBeenCalledWith({
      where: { student: { id: 'student-1' }, task: { id: 'task-1' } },
    });
  });

  it('rejects a task that the student has not submitted', async () => {
    submissionRepo.findOne.mockResolvedValue(null);

    await expect(service.getTaskResult('user-1', 'task-1')).rejects.toThrow(
      new NotFoundException('Topshiriq javobi topilmadi'),
    );
  });
});

describe('TaskSubmissionService.getStudentLessonResults', () => {
  const submissionRepo = { find: jest.fn() };
  const taskRepo = { find: jest.fn() };
  const lessonRepo = { findOne: jest.fn() };
  const studentRepo = { findOne: jest.fn() };
  const service = new TaskSubmissionService(
    submissionRepo as never,
    taskRepo as never,
    lessonRepo as never,
    studentRepo as never,
    {} as never,
    {} as never,
  );

  const submittedAt = new Date('2026-09-04T12:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    studentRepo.findOne.mockResolvedValue({ id: 'student-1' });
    lessonRepo.findOne.mockResolvedValue({ id: 'lesson-1', title: 'Greetings' });
    taskRepo.find.mockResolvedValue([
      {
        id: 'task-1',
        name: 'Vocabulary',
        file: null,
        contentType: null,
        questions: [
          { question: 'Choose a letter', options: ['A', 'B'], answer: 'a' },
          { question: 'Write a word', options: null, answer: 'hello' },
          { question: 'Unanswered', options: null, answer: 'value' },
        ],
      },
    ]);
  });

  it('returns the answer key beside the student answer and marks each question', async () => {
    submissionRepo.find.mockResolvedValue([
      {
        task: { id: 'task-1' },
        answer: JSON.stringify(['a', 'world']),
        isCorrect: false,
        createdAt: submittedAt,
      },
    ]);

    const result = await service.getStudentLessonResults('student-1', 'lesson-1');

    expect(result).toEqual({
      lesson: { id: 'lesson-1', title: 'Greetings' },
      tasks: [
        {
          taskId: 'task-1',
          name: 'Vocabulary',
          file: null,
          contentType: null,
          isCorrect: false,
          submittedAt,
          questions: [
            {
              question: 'Choose a letter',
              options: ['A', 'B'],
              answer: 'a',
              studentAnswer: 'a',
              isCorrect: true,
            },
            {
              question: 'Write a word',
              options: null,
              answer: 'hello',
              studentAnswer: 'world',
              isCorrect: false,
            },
            {
              question: 'Unanswered',
              options: null,
              answer: 'value',
              studentAnswer: null,
              isCorrect: false,
            },
          ],
        },
      ],
    });
  });

  it('reports an unsubmitted task as having no result rather than a wrong one', async () => {
    submissionRepo.find.mockResolvedValue([]);

    const result = await service.getStudentLessonResults('student-1', 'lesson-1');

    expect(result.tasks[0].isCorrect).toBeNull();
    expect(result.tasks[0].submittedAt).toBeNull();
    expect(result.tasks[0].questions.map((q) => q.studentAnswer)).toEqual([null, null, null]);
  });

  it('does not query submissions for a lesson that has no tasks', async () => {
    taskRepo.find.mockResolvedValue([]);

    const result = await service.getStudentLessonResults('student-1', 'lesson-1');

    expect(result.tasks).toEqual([]);
    expect(submissionRepo.find).not.toHaveBeenCalled();
  });

  it('rejects an unknown student', async () => {
    studentRepo.findOne.mockResolvedValue(null);

    await expect(service.getStudentLessonResults('missing', 'lesson-1')).rejects.toThrow(
      new NotFoundException('Talaba topilmadi'),
    );
  });

  it('rejects an unknown lesson', async () => {
    lessonRepo.findOne.mockResolvedValue(null);

    await expect(service.getStudentLessonResults('student-1', 'missing')).rejects.toThrow(
      new NotFoundException('Dars topilmadi'),
    );
  });
});
