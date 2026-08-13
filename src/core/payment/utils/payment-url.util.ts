import { Payment } from '@/core/payment/entity/payment.entity';

/**
 * To'lov turining `url` maydoni shablon bo'lib, ichida `$property` ko'rinishidagi
 * o'rin egallovchilar bo'ladi. Masalan:
 *
 *   https://my.click.uz/services/pay?merchant_id=62107&service_id=105315
 *     &merchant_user_id=$paymentId&transaction_param=$userFullName&amount=$amount
 *
 * Qiymatlar `encodeURIComponent` bilan kodlanadi. Noma'lum `$xxx` tokenlar
 * o'zgarishsiz qoladi — shunda shablondagi xato ko'rinib turadi.
 */
export function buildPaymentUrl(template: string, payment: Payment): string {
  const fullName = [payment.user?.firstName, payment.user?.lastName].filter(Boolean).join(' ');

  const values: Record<string, string> = {
    paymentId: payment.id,
    userId: payment.user?.id ?? '',
    userFullName: fullName,
    amount: String(payment.amount),
    // Payme (Paycom) summani tiyinda kutadi: 250 000 so'm → 25000000.
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
