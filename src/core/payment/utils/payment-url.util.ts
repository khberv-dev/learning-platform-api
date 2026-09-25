import { Payment } from '@/core/payment/entity/payment.entity';
import { Plan } from '@/core/plan/entity/plan.entity';

export function resolvePlan(payment: Payment): Plan | null {
  return payment.purchases?.[0]?.subscription?.plan ?? null;
}

export function buildPaymentUrl(template: string, payment: Payment): string {
  const fullName = [payment.student?.firstName, payment.student?.lastName].filter(Boolean).join(' ');
  const plan = resolvePlan(payment);

  const values: Record<string, string> = {
    paymentId: payment.id,
    userId: payment.student?.id ?? '',
    userFullName: fullName,
    amount: String(payment.amount),
    amountTiyin: String(payment.amount * 100),
    planId: plan?.id ?? '',
    planTitle: plan?.title ?? '',
    planMonth: plan ? String(plan.month) : '',
    courseId: plan?.course?.id ?? '',
    courseTitle: plan?.course?.title ?? '',
  };

  return template.replace(/\$(\w+)/g, (token, key: string) =>
    key in values ? encodeURIComponent(values[key]) : token,
  );
}
