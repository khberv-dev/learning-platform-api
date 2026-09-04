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

  it("returns the student's answer beside each question without the answer key", async () => {
    const submittedAt = new Date('2026-09-04T12:00:00Z');
    submissionRepo.findOne.mockResolvedValue({
      answer: JSON.stringify(['b', 'world']),
      isCorrect: false,
      createdAt: submittedAt,
    });

    const result = await service.getTaskResult('user-1', 'task-1');

    expect(result).toEqual({
      taskId: 'task-1',
      name: 'Vocabulary',
      file: null,
      contentType: null,
      questions: [
        { question: 'Choose a letter', options: ['A', 'B'], answer: 'b' },
        { question: 'Write a word', options: null, answer: 'world' },
        { question: 'Unanswered', options: null, answer: null },
      ],
      isCorrect: false,
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
