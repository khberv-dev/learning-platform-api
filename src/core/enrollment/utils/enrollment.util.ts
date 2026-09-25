import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

export async function findActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentId: string,
  lessonId: string,
): Promise<Enrollment | null> {
  return enrollmentRepo.findOne({
    where: {
      student: { id: studentId },
      course: { units: { lessons: { id: lessonId } } },
      status: EnrollmentStatus.ACTIVE,
    },
  });
}

export async function assertActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentId: string,
  lessonId: string,
): Promise<Enrollment> {
  const enrollment = await findActiveEnrollmentForLesson(enrollmentRepo, studentId, lessonId);
  if (!enrollment) throw new ForbiddenException('Siz bu kursga yozilmagansiz');
  return enrollment;
}
