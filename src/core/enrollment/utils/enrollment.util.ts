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
