import { timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymeTransaction } from '@/core/payment/entity/payme-transaction.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { PaymeMethod } from '@/core/payment/enum/payme-method.enum';
import { PAYME_ERROR_MESSAGE, PaymeError } from '@/core/payment/enum/payme-error.enum';
import { PaymeCancelReason, PaymeTransactionState } from '@/core/payment/enum/payme-transaction-state.enum';
import { PaymeParams, PaymeRequest, PaymeResponse, PaymeSuccessResponse } from '@/core/payment/dto/payme-request.dto';
import { PaymentService } from '@/core/payment/services/payment.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYME_RELATIONS = { plan: true, enrollment: { course: true }, user: true } as const;

/** Payme tranzaksiyasining amal qilish muddati — 12 soat. */
const TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/** 1 so'm = 100 tiyin. `payment.amount` so'mda, Payme esa tiyinda ishlaydi. */
const TIYIN_IN_SUM = 100;

/** Payme kabinetidagi hisob (account) maydonining sukut bo'yicha nomi. */
const DEFAULT_ACCOUNT_FIELD = 'payment_id';

/** Ichki xato — `handle` uni JSON-RPC javobiga o'giradi. */
class PaymeRpcError extends Error {
  constructor(
    readonly code: PaymeError,
    readonly data?: string,
  ) {
    super(`payme error ${code}`);
  }
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    @InjectRepository(PaymeTransaction) private readonly transactionRepo: Repository<PaymeTransaction>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  private get merchantKey(): string | undefined {
    return this.configService.get<string>('PAYME_MERCHANT_KEY');
  }

  private get accountField(): string {
    return this.configService.get<string>('PAYME_ACCOUNT_FIELD') || DEFAULT_ACCOUNT_FIELD;
  }

  /**
   * Payme `Authorization: Basic base64("Paycom:<merchant_key>")` yuboradi.
   * Kalit sozlanmagan bo'lsa barcha so'rovlar rad etiladi — Click'dagi kabi.
   */
  private authorized(header: string | undefined): boolean {
    const key = this.merchantKey;
    if (!key) {
      this.logger.error("PAYME_MERCHANT_KEY sozlanmagan — Payme so'rovlari rad etiladi");
      return false;
    }
    if (!header?.startsWith('Basic ')) return false;

    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;

    const login = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return login === 'Paycom' && this.matches(password, key);
  }

  /** Vaqt bo'yicha hujumlarni oldini olish uchun doimiy vaqtli solishtirish. */
  private matches(received: string, expected: string): boolean {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private success<T>(id: number | string | null, result: T): PaymeSuccessResponse<T> {
    return { jsonrpc: '2.0', id, result };
  }

  private failure(id: number | string | null, code: PaymeError, data?: string): PaymeResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message: PAYME_ERROR_MESSAGE[code], ...(data ? { data } : {}) },
    };
  }

  /** Kelgan so'rovni log'ga yozadi (maxfiy kalitsiz). */
  private logRequest(body: PaymeRequest): void {
    this.logger.log(
      `[${body?.params?.id ?? '-'}] ${body?.method ?? '-'} <- ${JSON.stringify({
        id: body?.id,
        params: body?.params,
      })}`,
    );
  }

  private logResponse(body: PaymeRequest, response: PaymeResponse): PaymeResponse {
    const line = `[${body?.params?.id ?? '-'}] ${body?.method ?? '-'} -> ${JSON.stringify(response)}`;
    if ('error' in response) this.logger.warn(line);
    else this.logger.log(line);
    return response;
  }

  /** JSON-RPC kirish nuqtasi. Har doim HTTP 200 — natija javob tanasida. */
  async handle(authorization: string | undefined, body: PaymeRequest): Promise<PaymeResponse> {
    this.logRequest(body);
    const id = body?.id ?? null;

    if (!this.authorized(authorization)) {
      return this.logResponse(body, this.failure(id, PaymeError.INSUFFICIENT_PRIVILEGE));
    }
    if (!body || typeof body !== 'object' || typeof body.method !== 'string') {
      return this.logResponse(body, this.failure(id, PaymeError.INVALID_REQUEST));
    }

    const params = body.params ?? {};
    // Noma'lum metodni `default` ushlaydi, shu sababli turga keltirish xavfsiz.
    const method = body.method as PaymeMethod;

    try {
      switch (method) {
        case PaymeMethod.CHECK_PERFORM_TRANSACTION:
          return this.logResponse(body, this.success(id, await this.checkPerformTransaction(params)));
        case PaymeMethod.CREATE_TRANSACTION:
          return this.logResponse(body, this.success(id, await this.createTransaction(params)));
        case PaymeMethod.PERFORM_TRANSACTION:
          return this.logResponse(body, this.success(id, await this.performTransaction(params)));
        case PaymeMethod.CANCEL_TRANSACTION:
          return this.logResponse(body, this.success(id, await this.cancelTransaction(params)));
        case PaymeMethod.CHECK_TRANSACTION:
          return this.logResponse(body, this.success(id, await this.checkTransaction(params)));
        case PaymeMethod.GET_STATEMENT:
          return this.logResponse(body, this.success(id, await this.getStatement(params)));
        default:
          return this.logResponse(body, this.failure(id, PaymeError.METHOD_NOT_FOUND));
      }
    } catch (error) {
      if (error instanceof PaymeRpcError) {
        return this.logResponse(body, this.failure(id, error.code, error.data));
      }
      this.logger.error(`Payme so'rovini bajarishda xato (${body.method})`, error as Error);
      return this.logResponse(body, this.failure(id, PaymeError.UNABLE_TO_PERFORM));
    }
  }

  // ── Yordamchilar ────────────────────────────────────────────────────────────

  /** Millisekundlarni sanaga; Payme vaqtlarni ms epoch'da yuboradi. */
  private toDate(value: unknown): Date | null {
    return typeof value === 'number' && Number.isFinite(value) ? new Date(value) : null;
  }

  /** Bo'sh vaqt Payme'ga `0` bo'lib qaytadi (null emas). */
  private toMs(value: Date | null): number {
    return value ? value.getTime() : 0;
  }

  /**
   * Hisob (account) maydonidan to'lovni topadi. Click'dagi kabi qiymat
   * to'lov (payment) id yoki foydalanuvchi (user) id bo'lishi mumkin: avval
   * to'lov id sifatida qidiriladi, topilmasa foydalanuvchining kutilayotgan
   * to'lovlaridan summasi mos keladigani tanlanadi.
   */
  private async resolvePayment(params: PaymeParams): Promise<Payment> {
    const field = this.accountField;
    const raw = params.account?.[field];
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (!value || !UUID_RE.test(value)) {
      throw new PaymeRpcError(PaymeError.INVALID_ACCOUNT, field);
    }

    const byPaymentId = await this.paymentRepo.findOne({ where: { id: value }, relations: PAYME_RELATIONS });
    if (byPaymentId) return byPaymentId;

    const pending = await this.paymentRepo.find({
      where: { user: { id: value }, status: PaymentStatus.CREATED },
      relations: PAYME_RELATIONS,
      order: { createdAt: 'DESC' },
    });
    if (pending.length === 0) {
      throw new PaymeRpcError(PaymeError.ORDER_NOT_FOUND, field);
    }

    return pending.find((payment) => payment.amount * TIYIN_IN_SUM === params.amount) ?? pending[0];
  }

  /**
   * Summa to'lov yaratilgandagi tarif narxi bilan solishtiriladi.
   * Kelgan qiymat **tiyinda** bo'lishi kerak: 250 000 so'm → `25000000`.
   */
  private assertAmount(payment: Payment, amount: unknown): void {
    const expected = payment.amount * TIYIN_IN_SUM;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount !== expected) {
      // Eng ko'p uchraydigan sabab — to'lov havolasida summa so'mda yuborilgani.
      this.logger.warn(
        `To'lov ${payment.id}: summa mos emas — kutilgan ${expected} tiyin (${payment.amount} so'm), ` +
          `kelgan ${JSON.stringify(amount)}`,
      );
      throw new PaymeRpcError(PaymeError.WRONG_AMOUNT);
    }
  }

  /** To'lov hali yopilmaganini tekshiradi. */
  private assertPayable(payment: Payment): void {
    if (payment.status !== PaymentStatus.CREATED) {
      throw new PaymeRpcError(PaymeError.ORDER_NOT_PAYABLE, this.accountField);
    }
  }

  private async findTransaction(params: PaymeParams): Promise<PaymeTransaction> {
    if (typeof params.id !== 'string' || !params.id) {
      throw new PaymeRpcError(PaymeError.INVALID_PARAMS);
    }
    const transaction = await this.transactionRepo.findOne({
      where: { transactionId: params.id },
      relations: { payment: PAYME_RELATIONS },
    });
    if (!transaction) throw new PaymeRpcError(PaymeError.TRANSACTION_NOT_FOUND);
    return transaction;
  }

  /** 12 soatdan oshgan kutilayotgan tranzaksiya avtomatik bekor qilinadi. */
  private async cancelIfExpired(transaction: PaymeTransaction): Promise<boolean> {
    if (transaction.state !== PaymeTransactionState.CREATED) return false;
    if (Date.now() - transaction.createTime.getTime() <= TRANSACTION_TIMEOUT_MS) return false;

    transaction.state = PaymeTransactionState.CANCELLED;
    transaction.reason = PaymeCancelReason.TIMEOUT;
    transaction.cancelTime = new Date();
    await this.transactionRepo.save(transaction);
    this.logger.warn(`[${transaction.transactionId}] muddati o'tdi — tranzaksiya bekor qilindi`);
    return true;
  }

  // ── Metodlar ────────────────────────────────────────────────────────────────

  /** To'lovni amalga oshirish mumkinligini tekshiradi. */
  private async checkPerformTransaction(params: PaymeParams): Promise<{ allow: true }> {
    const payment = await this.resolvePayment(params);
    this.assertAmount(payment, params.amount);
    this.assertPayable(payment);
    return { allow: true };
  }

  /**
   * Tranzaksiya yaratadi. Takroriy so'rov (xuddi shu `id`) avvalgi javobni
   * qaytaradi — Payme buni idempotent deb kutadi.
   */
  private async createTransaction(params: PaymeParams) {
    if (typeof params.id !== 'string' || !params.id) {
      throw new PaymeRpcError(PaymeError.INVALID_PARAMS);
    }

    const existing = await this.transactionRepo.findOne({
      where: { transactionId: params.id },
      relations: { payment: PAYME_RELATIONS },
    });

    if (existing) {
      if (await this.cancelIfExpired(existing)) {
        throw new PaymeRpcError(PaymeError.UNABLE_TO_PERFORM);
      }
      if (existing.state !== PaymeTransactionState.CREATED) {
        throw new PaymeRpcError(PaymeError.UNABLE_TO_PERFORM);
      }
      return {
        create_time: this.toMs(existing.createTime),
        transaction: existing.id,
        state: existing.state,
      };
    }

    const payment = await this.resolvePayment(params);
    this.assertAmount(payment, params.amount);
    this.assertPayable(payment);

    const paymeTime = this.toDate(params.time);
    if (!paymeTime) throw new PaymeRpcError(PaymeError.INVALID_PARAMS);

    // Shu to'lov uchun boshqa kutilayotgan tranzaksiya bo'lsa, yangisi ochilmaydi.
    // Payme sandbox bu holatda hisob (account) oralig'idagi xatoni kutadi.
    const pending = await this.transactionRepo.findOne({
      where: { payment: { id: payment.id }, state: PaymeTransactionState.CREATED },
    });
    if (pending && !(await this.cancelIfExpired(pending))) {
      throw new PaymeRpcError(PaymeError.PAYMENT_IN_PROGRESS, this.accountField);
    }

    const transaction = await this.transactionRepo.save({
      transactionId: params.id,
      payment,
      amount: params.amount as number,
      state: PaymeTransactionState.CREATED,
      paymeTime,
      createTime: new Date(),
    });

    payment.providerPaymentId = params.id;
    await this.paymentRepo.save(payment);
    this.logger.log(`[${params.id}] to'lov ${payment.id} uchun tranzaksiya yaratildi`);

    return {
      create_time: this.toMs(transaction.createTime),
      transaction: transaction.id,
      state: transaction.state,
    };
  }

  /** To'lovni tasdiqlaydi: to'lov `paid`, yozilish `active` bo'ladi. */
  private async performTransaction(params: PaymeParams) {
    const transaction = await this.findTransaction(params);

    if (transaction.state === PaymeTransactionState.PERFORMED) {
      return {
        transaction: transaction.id,
        perform_time: this.toMs(transaction.performTime),
        state: transaction.state,
      };
    }
    if (transaction.state !== PaymeTransactionState.CREATED) {
      throw new PaymeRpcError(PaymeError.UNABLE_TO_PERFORM);
    }
    if (await this.cancelIfExpired(transaction)) {
      throw new PaymeRpcError(PaymeError.UNABLE_TO_PERFORM);
    }

    await this.paymentService.markPaid(transaction.payment);

    transaction.state = PaymeTransactionState.PERFORMED;
    transaction.performTime = new Date();
    await this.transactionRepo.save(transaction);
    this.logger.log(
      `[${transaction.transactionId}] to'lov ${transaction.payment.id} tasdiqlandi, ` +
        `yozilish ${transaction.payment.enrollment?.id ?? '-'} faollashdi`,
    );

    return {
      transaction: transaction.id,
      perform_time: this.toMs(transaction.performTime),
      state: transaction.state,
    };
  }

  /**
   * Tranzaksiyani bekor qiladi.
   *
   * To'lanmagan tranzaksiya bekor qilinganda **to'lov `created` holatida qoladi**:
   * foydalanuvchi to'lovni yarim yo'lda tashlab ketgan bo'lishi mumkin, shunda u
   * qayta urinib ko'radi va yozilishdagi progress saqlanadi. To'langan tranzaksiya
   * bekor qilinsa (qaytarim) — to'lov ham, yozilish ham bekor qilinadi.
   */
  private async cancelTransaction(params: PaymeParams) {
    const transaction = await this.findTransaction(params);

    if (
      transaction.state === PaymeTransactionState.CANCELLED ||
      transaction.state === PaymeTransactionState.CANCELLED_AFTER_PERFORM
    ) {
      return {
        transaction: transaction.id,
        cancel_time: this.toMs(transaction.cancelTime),
        state: transaction.state,
      };
    }

    if (transaction.state === PaymeTransactionState.PERFORMED) {
      transaction.state = PaymeTransactionState.CANCELLED_AFTER_PERFORM;
      await this.paymentService.markCancelled(transaction.payment);
      this.logger.warn(
        `[${transaction.transactionId}] to'langan tranzaksiya bekor qilindi — ` +
          `yozilish ${transaction.payment.enrollment?.id ?? '-'} to'xtatildi`,
      );
    } else {
      transaction.state = PaymeTransactionState.CANCELLED;
    }

    transaction.reason = typeof params.reason === 'number' ? params.reason : null;
    transaction.cancelTime = new Date();
    await this.transactionRepo.save(transaction);

    return {
      transaction: transaction.id,
      cancel_time: this.toMs(transaction.cancelTime),
      state: transaction.state,
    };
  }

  /** Tranzaksiya holatini qaytaradi. */
  private async checkTransaction(params: PaymeParams) {
    const transaction = await this.findTransaction(params);
    return {
      create_time: this.toMs(transaction.createTime),
      perform_time: this.toMs(transaction.performTime),
      cancel_time: this.toMs(transaction.cancelTime),
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    };
  }

  /** Berilgan oraliqdagi tranzaksiyalar — Payme solishtirish (sverka) uchun so'raydi. */
  private async getStatement(params: PaymeParams) {
    const from = this.toDate(params.from);
    const to = this.toDate(params.to);
    if (!from || !to) throw new PaymeRpcError(PaymeError.INVALID_PARAMS);

    const transactions = await this.transactionRepo.find({
      where: { createTime: Between(from, to) },
      relations: { payment: true },
      order: { createTime: 'ASC' },
    });

    return {
      transactions: transactions.map((transaction) => ({
        id: transaction.transactionId,
        time: this.toMs(transaction.paymeTime),
        amount: transaction.amount,
        account: { [this.accountField]: transaction.payment?.id ?? null },
        create_time: this.toMs(transaction.createTime),
        perform_time: this.toMs(transaction.performTime),
        cancel_time: this.toMs(transaction.cancelTime),
        transaction: transaction.id,
        state: transaction.state,
        reason: transaction.reason,
      })),
    };
  }
}
