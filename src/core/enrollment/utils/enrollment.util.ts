import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

/** Sanaga oy qo'shadi — yozilish muddatini tarifdagi `month` bo'yicha hisoblash uchun. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Yozilish muddati tugaganmi — faol, lekin `end` sanasi o'tib ketgan bo'lsa. */
export function isEnrollmentExpired(enrollment: Enrollment, now = new Date()): boolean {
  return enrollment.status === EnrollmentStatus.ACTIVE && enrollment.end !== null && now > enrollment.end;
}

/**
 * Dars tegishli bo'lgan kursga talabaning faol yozilishini topadi.
 * Yozilish yo'q, faol emas yoki muddati tugagan bo'lsa — `null`.
 *
 * Kurs mazmuni (topshiriqlar, natijalar) shu tekshiruv orqali himoyalanadi.
 * `CourseModule` `EnrollmentModule` ni import qila olmaydi (aylanma bog'liqlik
 * bo'lib qoladi), shuning uchun repository parametr sifatida uzatiladi.
 */
export async function findActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentUserId: string,
  lessonId: string,
): Promise<Enrollment | null> {
  const enrollment = await enrollmentRepo.findOne({
    where: {
      student: { user: { id: studentUserId } },
      course: { units: { lessons: { id: lessonId } } },
      status: EnrollmentStatus.ACTIVE,
    },
  });
  if (!enrollment || isEnrollmentExpired(enrollment)) return null;
  return enrollment;
}

/** `findActiveEnrollmentForLesson` — yozilish bo'lmasa 403 qaytaradi. */
export async function assertActiveEnrollmentForLesson(
  enrollmentRepo: Repository<Enrollment>,
  studentUserId: string,
  lessonId: string,
): Promise<Enrollment> {
  const enrollment = await findActiveEnrollmentForLesson(enrollmentRepo, studentUserId, lessonId);
  if (!enrollment) throw new ForbiddenException('Siz bu kursga yozilmagansiz yoki muddati tugagan');
  return enrollment;
}
