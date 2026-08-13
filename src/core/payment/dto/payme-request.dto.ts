import { PaymeError, PaymeErrorMessage } from '@/core/payment/enum/payme-error.enum';

/**
 * Payme JSON-RPC 2.0 so'rovi. Bu yerda `class` emas, `interface` ishlatiladi:
 * global `ValidationPipe` (`forbidNonWhitelisted: true`) DTO uchraganda kutilmagan
 * maydonga HTTP 400 qaytaradi, Payme esa har qanday xatoni **javob tanasidagi**
 * `error` orqali kutadi. Shu sababli tekshiruv `PaymeService` ichida qo'lda bajariladi.
 */
export interface PaymeRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: PaymeParams;
}

export interface PaymeParams {
  /** Payme tomonidagi tranzaksiya identifikatori. */
  id?: string;
  /** Tranzaksiya Payme tomonda yaratilgan vaqt — millisekundlarda. */
  time?: number;
  /** Summa — tiyinda. */
  amount?: number;
  /** Merchant kabinetida sozlangan maydonlar, masalan `{ payment_id: '...' }`. */
  account?: Record<string, unknown>;
  /** Bekor qilish sababi. */
  reason?: number;
  /** GetStatement oralig'i — millisekundlarda. */
  from?: number;
  to?: number;
  /** SetFiscalData: chek turi — `PERFORM` yoki `CANCEL`. */
  type?: string;
  /** SetFiscalData: fiskal chek ma'lumotlari (`fiscal_sign`, `qr_code_url`, ...). */
  fiscal_data?: Record<string, unknown>;
}

export interface PaymeSuccessResponse<T> {
  jsonrpc: '2.0';
  id: number | string | null;
  result: T;
}

export interface PaymeErrorResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  error: {
    code: PaymeError;
    message: PaymeErrorMessage;
    data?: string;
  };
}

export type PaymeResponse = PaymeSuccessResponse<unknown> | PaymeErrorResponse;
