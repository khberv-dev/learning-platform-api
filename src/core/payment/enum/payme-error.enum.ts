/** Payme (Paycom) Merchant API xato kodlari. */
export enum PaymeError {
  /** JSON'ni o'qib bo'lmadi. */
  PARSE = -32700,
  /** JSON-RPC so'rovi noto'g'ri. */
  INVALID_REQUEST = -32600,
  /** Bunday metod yo'q. */
  METHOD_NOT_FOUND = -32601,
  /** Metod parametrlari noto'g'ri. */
  INVALID_PARAMS = -32602,
  /** Avtorizatsiya o'tmadi. */
  INSUFFICIENT_PRIVILEGE = -32504,
  /** Summa mos emas. */
  WRONG_AMOUNT = -31001,
  /** Tranzaksiya topilmadi. */
  TRANSACTION_NOT_FOUND = -31003,
  /** Bekor qilib bo'lmaydi. */
  UNABLE_TO_CANCEL = -31007,
  /** Amalni bajarib bo'lmaydi. */
  UNABLE_TO_PERFORM = -31008,
  /** -31050..-31099 oralig'i merchant ixtiyorida: hisob (account) xatolari. */
  ORDER_NOT_FOUND = -31050,
  ORDER_NOT_PAYABLE = -31051,
  INVALID_ACCOUNT = -31052,
}

/** Payme xato xabarini uch tilda kutadi. */
export interface PaymeErrorMessage {
  uz: string;
  ru: string;
  en: string;
}

export const PAYME_ERROR_MESSAGE: Record<PaymeError, PaymeErrorMessage> = {
  [PaymeError.PARSE]: {
    uz: "So'rovni o'qib bo'lmadi",
    ru: 'Ошибка разбора запроса',
    en: 'Parse error',
  },
  [PaymeError.INVALID_REQUEST]: {
    uz: "So'rov formati noto'g'ri",
    ru: 'Неверный запрос',
    en: 'Invalid request',
  },
  [PaymeError.METHOD_NOT_FOUND]: {
    uz: 'Metod topilmadi',
    ru: 'Метод не найден',
    en: 'Method not found',
  },
  [PaymeError.INVALID_PARAMS]: {
    uz: "Parametrlar noto'g'ri",
    ru: 'Неверные параметры',
    en: 'Invalid params',
  },
  [PaymeError.INSUFFICIENT_PRIVILEGE]: {
    uz: 'Ruxsat yetarli emas',
    ru: 'Недостаточно привилегий',
    en: 'Insufficient privilege',
  },
  [PaymeError.WRONG_AMOUNT]: {
    uz: "Summa noto'g'ri",
    ru: 'Неверная сумма',
    en: 'Wrong amount',
  },
  [PaymeError.TRANSACTION_NOT_FOUND]: {
    uz: 'Tranzaksiya topilmadi',
    ru: 'Транзакция не найдена',
    en: 'Transaction not found',
  },
  [PaymeError.UNABLE_TO_CANCEL]: {
    uz: "Tranzaksiyani bekor qilib bo'lmaydi",
    ru: 'Невозможно отменить транзакцию',
    en: 'Unable to cancel transaction',
  },
  [PaymeError.UNABLE_TO_PERFORM]: {
    uz: "Amalni bajarib bo'lmaydi",
    ru: 'Невозможно выполнить операцию',
    en: 'Unable to perform operation',
  },
  [PaymeError.ORDER_NOT_FOUND]: {
    uz: "To'lov topilmadi",
    ru: 'Платёж не найден',
    en: 'Payment not found',
  },
  [PaymeError.ORDER_NOT_PAYABLE]: {
    uz: "To'lov allaqachon yakunlangan",
    ru: 'Платёж уже завершён',
    en: 'Payment is already closed',
  },
  [PaymeError.INVALID_ACCOUNT]: {
    uz: "Hisob raqami noto'g'ri",
    ru: 'Неверный номер счёта',
    en: 'Invalid account',
  },
};
