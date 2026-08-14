import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isDevelopment } from '@/shared/config/environment.config';

// Eskiz tokenlari ~30 kun amal qiladi; biroz erta yangilanadi.
const TOKEN_TTL_MS = 25 * 24 * 60 * 60 * 1000;
const SMS_FROM = '4546';
/** Provayder javob bermasa so'rov cheksiz osilib qolmasligi uchun. */
const REQUEST_TIMEOUT_MS = 10_000;

interface LoginResponse {
  data?: { token?: string };
}

@Injectable()
export class EskizService {
  private readonly logger = new Logger(EskizService.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sozlamalar konstruktorda emas, yuborish paytida o'qiladi — shunda Eskiz
   * sozlanmagan bo'lsa ham ilova ishga tushadi va xato faqat SMS yuborishda
   * chiqadi.
   */
  private get credentials(): { baseUrl: string; email: string; password: string } {
    const baseUrl = this.configService.get<string>('ESKIZ_API_URL');
    const email = this.configService.get<string>('ESKIZ_API_USER');
    const password = this.configService.get<string>('ESKIZ_API_KEY');

    if (!baseUrl || !email || !password) {
      this.logger.error('ESKIZ_API_URL / ESKIZ_API_USER / ESKIZ_API_KEY sozlanmagan — SMS yuborilmaydi');
      throw new ServiceUnavailableException('SMS xizmati sozlanmagan');
    }

    return { baseUrl: baseUrl.replace(/\/+$/, ''), email, password };
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    const mobilePhone = this.normalizePhone(phoneNumber);

    // DEVELOPMENT muhitida haqiqiy SMS yuborilmaydi — balans sarflanmasin va
    // sinov raqamlariga xabar bormasin. Xabar log'ga yoziladi.
    if (isDevelopment(this.configService)) {
      this.logger.log(`[DEVELOPMENT] SMS yuborilmadi (${this.maskPhone(mobilePhone)}): ${message}`);
      return;
    }

    const body = new URLSearchParams({ mobile_phone: mobilePhone, message, from: SMS_FROM });

    let response = await this.post('message/sms/send', body, await this.getToken());
    if (response.status === 401) {
      // Token eskirgan bo'lishi mumkin — bir marta yangilab qayta urinamiz.
      response = await this.post('message/sms/send', body, await this.getToken(true));
    }

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Eskiz sendSms xatosi (${response.status}): ${detail}`);
      throw new ServiceUnavailableException("SMS yuborib bo'lmadi");
    }

    this.logger.log(`SMS yuborildi: ${this.maskPhone(mobilePhone)}`);
  }

  private async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    this.token = await this.login();
    this.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return this.token;
  }

  private async login(): Promise<string> {
    const { baseUrl, email, password } = this.credentials;
    const body = new URLSearchParams({ email, password });

    const response = await this.request(`${baseUrl}/auth/login`, { method: 'POST', body });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Eskiz login xatosi (${response.status}): ${detail}`);
      throw new ServiceUnavailableException("SMS provayderiga ulanib bo'lmadi");
    }

    const json = (await response.json()) as LoginResponse;
    const token = json.data?.token;
    if (!token) {
      this.logger.error('Eskiz login token qaytarmadi');
      throw new ServiceUnavailableException("SMS provayderiga ulanib bo'lmadi");
    }

    return token;
  }

  private post(path: string, body: URLSearchParams, token: string): Promise<Response> {
    const { baseUrl } = this.credentials;
    return this.request(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  }

  /**
   * Timeout bilan so'rov. Busiz provayder javob bermasa HTTP so'rov cheksiz
   * kutib qoladi va ulanishlarni band qiladi.
   */
  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      this.logger.error(`Eskiz so'rovi bajarilmadi (${url}): ${(error as Error).message}`);
      throw new ServiceUnavailableException("SMS provayderiga ulanib bo'lmadi");
    }
  }

  /** Eskiz 998XXXXXXXXX kutadi — faqat raqamlar, `+` siz. */
  private normalizePhone(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /** Log'da to'liq raqam ko'rinmasligi uchun. */
  private maskPhone(phoneNumber: string): string {
    return phoneNumber.replace(/^(\d{5})\d+(\d{2})$/, '$1****$2');
  }
}
