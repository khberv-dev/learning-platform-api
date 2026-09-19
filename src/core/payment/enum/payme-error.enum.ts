export enum PaymeError {
  NON_POST = -32300,
  PARSE = -32700,
  SYSTEM = -32400,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INSUFFICIENT_PRIVILEGE = -32504,
  WRONG_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  UNABLE_TO_CANCEL = -31007,
  UNABLE_TO_PERFORM = -31008,
  ORDER_NOT_FOUND = -31050,
  ORDER_NOT_PAYABLE = -31051,
  INVALID_ACCOUNT = -31052,
  PAYMENT_IN_PROGRESS = -31053,
}

export interface PaymeErrorMessage {
  uz: string;
  ru: string;
  en: string;
}

export const PAYME_ERROR_MESSAGE: Record<PaymeError, PaymeErrorMessage> = {
  [PaymeError.NON_POST]: {
    uz: "So'rov POST bo'lishi kerak",
    ru: 'Запрос должен быть POST',
    en: 'Request must be POST',
  },
  [PaymeError.SYSTEM]: {
    uz: 'Tizim xatosi',
    ru: 'Системная ошибка',
    en: 'System error',
  },
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
  [PaymeError.PAYMENT_IN_PROGRESS]: {
    uz: "Bu to'lov uchun tugallanmagan tranzaksiya mavjud",
    ru: 'По этому платежу есть незавершённая транзакция',
    en: 'Another transaction is already pending for this payment',
  },
};
