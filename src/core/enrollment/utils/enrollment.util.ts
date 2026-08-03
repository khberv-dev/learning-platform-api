import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

/** Yozilish muddati tugaganmi — faol, lekin `end` sanasi o'tib ketgan bo'lsa. */
export function isEnrollmentExpired(enrollment: Enrollment, now = new Date()): boolean {
  return enrollment.status === EnrollmentStatus.ACTIVE && enrollment.end !== null && now > enrollment.end;
}
