import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { ClickAction } from '@/core/payment/enum/click-action.enum';
import { CLICK_ERROR_NOTE, ClickError } from '@/core/payment/enum/click-error.enum';
import { ClickPrepareDto } from '@/core/payment/dto/click-prepare.dto';
import { ClickCompleteDto } from '@/core/payment/dto/click-complete.dto';
import { PaymentService } from '@/core/payment/services/payment.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CLICK_RELATIONS = { plan: true, enrollment: { course: true }, user: true } as const;

export interface ClickPrepareResponse {
  click_trans_id: string;
  merchant_trans_id: string;
  merchant_prepare_id: string | null;
  error: ClickError;
  error_note: string;
}

export interface ClickCompleteResponse {
  click_trans_id: string;
  merchant_trans_id: string;
  merchant_confirm_id: string | null;
  error: ClickError;
  error_note: string;
}

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  private get secretKey(): string | undefined {
    return this.configService.get<string>('CLICK_SECRET_KEY');
  }

  private get serviceId(): string | undefined {
    return this.configService.get<string>('CLICK_SERVICE_ID');
  }

  /**
   * sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
   *   [+ merchant_prepare_id] + amount + action + sign_time)
   */
  private verifySign(dto: ClickCompleteDto, withPrepareId: boolean): boolean {
    const secret = this.secretKey;
    if (!secret) {
      this.logger.error("CLICK_SECRET_KEY sozlanmagan — Click so'rovlari rad etiladi");
      return false;
    }

    const parts = [
      dto.click_trans_id,
      dto.service_id,
      secret,
      dto.merchant_trans_id,
      ...(withPrepareId ? [dto.merchant_prepare_id] : []),
      dto.amount,
      dto.action,
      dto.sign_time,
    ];

    const expected = createHash('md5').update(parts.join('')).digest('hex');
    const matches = expected === dto.sign_string?.toLowerCase();
    if (!matches) {
      // Maxfiy kalit hech qachon log'ga yozilmaydi — faqat hash'lar.
      this.logger.warn(`[${dto.click_trans_id ?? '-'}] imzo mos emas: kutilgan=${expected} kelgan=${dto.sign_string}`);
    }
    return matches;
  }

  private amountMatches(payment: Payment, amount: string | undefined): boolean {
    // To'lov yaratilgandagi summa bilan solishtiriladi — tarif keyin o'zgarsa ham.
    const received = Number(amount);
    return Number.isFinite(received) && Math.abs(received - payment.amount) < 0.01;
  }

  /** Kelgan so'rovni to'liq log'ga yozadi (maxfiy kalitsiz). */
  private logRequest(stage: string, dto: ClickCompleteDto): void {
    this.logger.log(
      `[${dto.click_trans_id ?? '-'}] ${stage} <- ${JSON.stringify({
        service_id: dto.service_id,
        click_paydoc_id: dto.click_paydoc_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_prepare_id: dto.merchant_prepare_id,
        amount: dto.amount,
        action: dto.action,
        error: dto.error,
        error_note: dto.error_note,
        sign_time: dto.sign_time,
        sign_string: dto.sign_string,
      })}`,
    );
  }

  /** Javobni log'ga yozadi: muvaffaqiyat — log, xato — warn. */
  private logResponse<T extends { error: ClickError }>(stage: string, dto: ClickPrepareDto, response: T): T {
    const line = `[${dto.click_trans_id ?? '-'}] ${stage} -> ${JSON.stringify(response)}`;
    if (response.error === ClickError.SUCCESS) this.logger.log(line);
    else this.logger.warn(line);
    return response;
  }

  /**
   * `merchant_trans_id` — to'lov (payment) id yoki foydalanuvchi (user) id
   * bo'lishi mumkin: qaysi biri to'lov sahifasining `transaction_param` iga
   * qo'yilganiga bog'liq. Avval to'lov id sifatida qidiriladi (aniq moslik),
   * topilmasa foydalanuvchining kutilayotgan to'lovlari ichidan tanlanadi.
   */
  private async resolvePendingPayment(merchantTransId: string, amount?: string): Promise<Payment | null> {
    const byPaymentId = await this.paymentRepo.findOne({
      where: { id: merchantTransId, status: PaymentStatus.CREATED },
      relations: CLICK_RELATIONS,
    });
    if (byPaymentId) return byPaymentId;

    const candidates = await this.paymentRepo.find({
      where: { user: { id: merchantTransId }, status: PaymentStatus.CREATED },
      relations: CLICK_RELATIONS,
      order: { createdAt: 'DESC' },
    });
    if (candidates.length === 0) return null;

    return candidates.find((p) => this.amountMatches(p, amount)) ?? candidates[0];
  }

  /**
   * Javobdagi `merchant_trans_id` — foydalanuvchi (user) id. To'lov topilgan
   * bo'lsa uning egasidan olinadi, aks holda so'rovdagi qiymat qaytariladi.
   */
  private merchantTransId(dto: ClickPrepareDto, payment?: Payment): string {
    return payment?.user?.id ?? dto.merchant_trans_id ?? '';
  }

  private prepareResponse(dto: ClickPrepareDto, error: ClickError, payment?: Payment): ClickPrepareResponse {
    return this.logResponse('prepare', dto, {
      click_trans_id: dto.click_trans_id ?? '',
      merchant_trans_id: this.merchantTransId(dto, payment),
      merchant_prepare_id: payment?.id ?? null,
      error,
      error_note: CLICK_ERROR_NOTE[error],
    });
  }

  private completeResponse(dto: ClickCompleteDto, error: ClickError, payment?: Payment): ClickCompleteResponse {
    return this.logResponse('complete', dto, {
      click_trans_id: dto.click_trans_id ?? '',
      merchant_trans_id: this.merchantTransId(dto, payment),
      merchant_confirm_id: payment?.id ?? null,
      error,
      error_note: CLICK_ERROR_NOTE[error],
    });
  }

  /**
   * 1-bosqich. To'lovga Click tranzaksiya identifikatorini biriktiradi va
   * merchant_prepare_id sifatida to'lov (payment) id qaytaradi.
   */
  async prepare(dto: ClickPrepareDto): Promise<ClickPrepareResponse> {
    this.logRequest('prepare', dto);

    if (!dto.click_trans_id || !dto.merchant_trans_id || !dto.amount || !dto.sign_time || !dto.sign_string) {
      return this.prepareResponse(dto, ClickError.BAD_REQUEST);
    }
    if (this.serviceId && dto.service_id !== this.serviceId) {
      return this.prepareResponse(dto, ClickError.BAD_REQUEST);
    }
    if (dto.action !== ClickAction.PREPARE) {
      return this.prepareResponse(dto, ClickError.ACTION_NOT_FOUND);
    }
    if (!this.verifySign(dto, false)) {
      return this.prepareResponse(dto, ClickError.SIGN_CHECK_FAILED);
    }
    if (!UUID_RE.test(dto.merchant_trans_id)) {
      return this.prepareResponse(dto, ClickError.USER_NOT_FOUND);
    }

    const payment = await this.resolvePendingPayment(dto.merchant_trans_id, dto.amount);

    if (!payment) {
      return this.prepareResponse(dto, ClickError.TRANSACTION_NOT_FOUND);
    }

    if (!this.amountMatches(payment, dto.amount)) {
      return this.prepareResponse(dto, ClickError.INCORRECT_AMOUNT, payment);
    }

    if (Number(dto.error) < 0) {
      await this.paymentService.markCancelled(payment);
      return this.prepareResponse(dto, ClickError.TRANSACTION_CANCELLED, payment);
    }

    payment.providerPaymentId = dto.click_trans_id;
    await this.paymentRepo.save(payment);
    this.logger.log(`[${dto.click_trans_id}] to'lov ${payment.id} ga provider id biriktirildi`);

    return this.prepareResponse(dto, ClickError.SUCCESS, payment);
  }

  /**
   * 2-bosqich. To'lovni `paid` holatiga o'tkazadi va yozilishni faollashtiradi.
   * merchant_confirm_id sifatida to'lov (payment) id qaytariladi.
   */
  async complete(dto: ClickCompleteDto): Promise<ClickCompleteResponse> {
    this.logRequest('complete', dto);

    if (
      !dto.click_trans_id ||
      !dto.merchant_trans_id ||
      !dto.merchant_prepare_id ||
      !dto.amount ||
      !dto.sign_time ||
      !dto.sign_string
    ) {
      return this.completeResponse(dto, ClickError.BAD_REQUEST);
    }
    if (this.serviceId && dto.service_id !== this.serviceId) {
      return this.completeResponse(dto, ClickError.BAD_REQUEST);
    }
    if (dto.action !== ClickAction.COMPLETE) {
      return this.completeResponse(dto, ClickError.ACTION_NOT_FOUND);
    }
    if (!this.verifySign(dto, true)) {
      return this.completeResponse(dto, ClickError.SIGN_CHECK_FAILED);
    }
    if (!UUID_RE.test(dto.merchant_prepare_id)) {
      return this.completeResponse(dto, ClickError.TRANSACTION_NOT_FOUND);
    }

    const payment = await this.paymentRepo.findOne({
      where: { id: dto.merchant_prepare_id },
      relations: CLICK_RELATIONS,
    });

    // merchant_trans_id prepare'dagidek to'lov id yoki foydalanuvchi id bo'lishi mumkin.
    if (!payment || (payment.user.id !== dto.merchant_trans_id && payment.id !== dto.merchant_trans_id)) {
      return this.completeResponse(dto, ClickError.TRANSACTION_NOT_FOUND);
    }
    if (payment.providerPaymentId && payment.providerPaymentId !== dto.click_trans_id) {
      return this.completeResponse(dto, ClickError.TRANSACTION_NOT_FOUND, payment);
    }
    if (payment.status === PaymentStatus.PAID) {
      return this.completeResponse(dto, ClickError.ALREADY_PAID, payment);
    }
    if (payment.status === PaymentStatus.CANCELLED) {
      return this.completeResponse(dto, ClickError.TRANSACTION_CANCELLED, payment);
    }
    if (!this.amountMatches(payment, dto.amount)) {
      return this.completeResponse(dto, ClickError.INCORRECT_AMOUNT, payment);
    }

    if (Number(dto.error) < 0) {
      await this.paymentService.markCancelled(payment);
      return this.completeResponse(dto, ClickError.TRANSACTION_CANCELLED, payment);
    }

    try {
      await this.paymentService.markPaid(payment);
      this.logger.log(
        `[${dto.click_trans_id}] to'lov ${payment.id} tasdiqlandi, yozilish ${payment.enrollment?.id ?? '-'} faollashdi`,
      );
    } catch (error) {
      this.logger.error(`To'lovni tasdiqlashda xato (payment ${payment.id})`, error as Error);
      return this.completeResponse(dto, ClickError.FAILED_TO_UPDATE_USER, payment);
    }

    return this.completeResponse(dto, ClickError.SUCCESS, payment);
  }
}
