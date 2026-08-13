/** Payme tranzaksiyasining holati (Paycom spetsifikatsiyasidagi `state`). */
export enum PaymeTransactionState {
  /** Yaratilgan, to'lov kutilmoqda. */
  CREATED = 1,
  /** To'langan. */
  PERFORMED = 2,
  /** To'lanmasdan bekor qilingan. */
  CANCELLED = -1,
  /** To'langandan keyin bekor qilingan (qaytarim). */
  CANCELLED_AFTER_PERFORM = -2,
}

/** Payme tranzaksiyani bekor qilish sabablari. */
export enum PaymeCancelReason {
  /** Muddati o'tgani uchun tizim bekor qildi. */
  TIMEOUT = 4,
}
