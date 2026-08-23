import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isDevelopment } from '@/shared/config/environment.config';

const RESEND_API_URL = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(email: string, code: string): Promise<void> {
    if (isDevelopment(this.configService)) {
      this.logger.log(`[DEVELOPMENT] Email yuborilmadi (${this.maskEmail(email)}): OTP ${code}`);
      return;
    }

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('RESEND_FROM');
    if (!apiKey || !from) {
      this.logger.error('RESEND_API_KEY / RESEND_FROM sozlanmagan — email yuborilmaydi');
      throw new ServiceUnavailableException('Email xizmati sozlanmagan');
    }

    let response: Response;
    try {
      response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'iTeach Learning Platform API',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'iTeach tasdiqlash kodi',
          text: `iTeach ilovasiga kirish uchun tasdiqlash kodi: ${code}. Kod 5 daqiqa amal qiladi.`,
          html: `<p>iTeach ilovasiga kirish uchun tasdiqlash kodi:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>Kod 5 daqiqa amal qiladi.</p>`,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Resend so'rovi bajarilmadi: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Email yuborib bo'lmadi");
    }

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Resend xatosi (${response.status}): ${detail}`);
      throw new ServiceUnavailableException("Email yuborib bo'lmadi");
    }

    this.logger.log(`Email yuborildi: ${this.maskEmail(email)}`);
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
}
