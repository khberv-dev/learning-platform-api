import { PaymeError, PaymeErrorMessage } from '@/core/payment/enum/payme-error.enum';

export interface PaymeRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: PaymeParams;
}

export interface PaymeParams {
  id?: string;
  time?: number;
  amount?: number;
  account?: Record<string, unknown>;
  reason?: number;
  from?: number;
  to?: number;
  type?: string;
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
