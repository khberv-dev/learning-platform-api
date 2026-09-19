import { Payment } from '@/core/payment/entity/payment.entity';

export function buildPaymentUrl(template: string, payment: Payment): string {
  const fullName = [payment.student?.firstName, payment.student?.lastName].filter(Boolean).join(' ');

  const values: Record<string, string> = {
    paymentId: payment.id,
    userId: payment.student?.id ?? '',
    userFullName: fullName,
    amount: String(payment.amount),
    amountTiyin: String(payment.amount * 100),
    planId: payment.plan?.id ?? '',
    planTitle: payment.plan?.title ?? '',
    planMonth: payment.plan ? String(payment.plan.month) : '',
    enrollmentId: payment.enrollment?.id ?? '',
    courseId: payment.enrollment?.course?.id ?? '',
    courseTitle: payment.enrollment?.course?.title ?? '',
  };

  return template.replace(/\$(\w+)/g, (token, key: string) =>
    key in values ? encodeURIComponent(values[key]) : token,
  );
}
