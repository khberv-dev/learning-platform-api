import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function isEnrollmentExpired(enrollment: Enrollment, now = new Date()): boolean {
  return enrollment.status === EnrollmentStatus.ACTIVE && enrollment.end !== null && now > enrollment.end;
}

export async function findActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentId: string,
  lessonId: string,
): Promise<Enrollment | null> {
  const enrollment = await enrollmentRepo.findOne({
    where: {
      student: { id: studentId },
      course: { units: { lessons: { id: lessonId } } },
      status: EnrollmentStatus.ACTIVE,
    },
  });
  if (!enrollment || isEnrollmentExpired(enrollment)) return null;
  return enrollment;
}

export async function assertActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentId: string,
  lessonId: string,
): Promise<Enrollment> {
  const enrollment = await findActiveEnrollmentForLesson(enrollmentRepo, studentId, lessonId);
  if (!enrollment) throw new ForbiddenException('Siz bu kursga yozilmagansiz yoki muddati tugagan');
  return enrollment;
}
