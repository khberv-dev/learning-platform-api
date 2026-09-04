import { NotFoundException } from '@nestjs/common';

import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

describe('EnrollmentService.getStudentCourseProgress', () => {
  const studentRepo = { exists: jest.fn() };
  const enrollmentRepo = { findOne: jest.fn() };
  const service = new EnrollmentService(
    enrollmentRepo as never,
    {} as never,
    studentRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns all lessons and calculates lesson-weighted progress', async () => {
    studentRepo.exists.mockResolvedValue(true);
    enrollmentRepo.findOne.mockResolvedValue({
      id: 'enrollment-1',
      status: EnrollmentStatus.ACTIVE,
      start: new Date('2026-01-01'),
      end: new Date('2026-12-31'),
      course: {
        id: 'course-1',
        title: 'Course',
        units: [
          {
            id: 'unit-2',
            title: 'Second unit',
            index: 2,
            createdAt: new Date('2026-01-01'),
            lessons: [
              {
                id: 'lesson-3',
                title: 'Third lesson',
                index: 1,
                createdAt: new Date('2026-01-01'),
              },
            ],
          },
          {
            id: 'unit-1',
            title: 'First unit',
            index: 1,
            createdAt: new Date('2026-01-01'),
            lessons: [
              {
                id: 'lesson-2',
                title: 'Second lesson',
                index: 2,
                createdAt: new Date('2026-01-02'),
              },
              {
                id: 'lesson-1',
                title: 'First lesson',
                index: 1,
                createdAt: new Date('2026-01-01'),
              },
            ],
          },
        ],
      },
      progresses: [
        { lesson: { id: 'lesson-1' }, progress: 100 },
        { lesson: { id: 'lesson-3' }, progress: 50 },
      ],
    });

    const result = await service.getStudentCourseProgress('student-1', 'enrollment-1');

    expect(result.course.progress).toBe(50);
    expect(result.course.units.map((unit) => unit.id)).toEqual(['unit-1', 'unit-2']);
    expect(result.course.units[0]).toMatchObject({
      progress: 50,
      lessons: [
        { id: 'lesson-1', progress: 100 },
        { id: 'lesson-2', progress: 0 },
      ],
    });
    expect(result.course.units[1].progress).toBe(50);
  });

  it('rejects an enrollment that does not belong to the student', async () => {
    studentRepo.exists.mockResolvedValue(true);
    enrollmentRepo.findOne.mockResolvedValue(null);

    await expect(service.getStudentCourseProgress('student-1', 'enrollment-1')).rejects.toThrow(
      new NotFoundException('Yozilish topilmadi'),
    );
  });
});

describe('EnrollmentService student course lists', () => {
  const enrollmentRepo = { find: jest.fn() };
  const studentRepo = { findOne: jest.fn() };
  const courseService = {
    findActiveCourses: jest.fn(),
    contentCountsByCourse: jest.fn(),
  };
  const service = new EnrollmentService(
    enrollmentRepo as never,
    {} as never,
    studentRepo as never,
    {} as never,
    {} as never,
    courseService as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
    studentRepo.findOne.mockResolvedValue({ id: 'student-1' });
  });

  afterEach(() => jest.useRealTimers());

  it('excludes expired enrollments from my courses', async () => {
    enrollmentRepo.find.mockResolvedValue([
      {
        id: 'expired-enrollment',
        status: EnrollmentStatus.ACTIVE,
        end: new Date('2026-09-03T12:00:00Z'),
        course: { id: 'course-expired' },
        progresses: [],
      },
      {
        id: 'current-enrollment',
        status: EnrollmentStatus.ACTIVE,
        end: new Date('2026-09-05T12:00:00Z'),
        course: { id: 'course-current' },
        progresses: [],
      },
    ]);
    courseService.contentCountsByCourse.mockResolvedValue(
      new Map([['course-current', { unitsCount: 2, lessonsCount: 3 }]]),
    );

    const result = await service.getMyCourses('user-1');

    expect(courseService.contentCountsByCourse).toHaveBeenCalledWith(['course-current']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'current-enrollment', isExpired: false });
  });

  it('includes a course in available courses when its enrollment expired', async () => {
    enrollmentRepo.find.mockResolvedValue([
      {
        status: EnrollmentStatus.ACTIVE,
        end: new Date('2026-09-03T12:00:00Z'),
        course: { id: 'course-expired' },
      },
      {
        status: EnrollmentStatus.ACTIVE,
        end: new Date('2026-09-05T12:00:00Z'),
        course: { id: 'course-current' },
      },
    ]);
    courseService.findActiveCourses.mockResolvedValue([
      { id: 'course-expired' },
      { id: 'course-current' },
      { id: 'course-new' },
    ]);

    const result = await service.getAvailableCourses('user-1');

    expect(result).toEqual([{ id: 'course-expired' }, { id: 'course-new' }]);
  });
});
