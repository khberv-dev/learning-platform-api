import { EntityManager, IsNull, Not } from 'typeorm';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { Plan } from '@/core/plan/entity/plan.entity';

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function applyPlanSubscription(
  manager: EntityManager,
  studentId: string,
  plan: Plan,
): Promise<Subscription | null> {
  if (!plan.hasSubscription) return null;

  const repo = manager.getRepository(Subscription);
  const now = new Date();
  const current = await repo.findOne({
    where: { student: { id: studentId }, course: { id: plan.course.id }, end: Not(IsNull()) },
    order: { end: 'DESC' },
  });

  if (current?.end && current.end > now) {
    current.end = addMonths(current.end, plan.month);
    return repo.save(current);
  }

  return repo.save({
    student: { id: studentId },
    course: plan.course,
    start: now,
    end: addMonths(now, plan.month),
  });
}
