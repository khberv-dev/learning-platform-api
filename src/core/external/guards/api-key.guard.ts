import { timingSafeEqual } from 'crypto';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export const API_KEY_HEADER = 'x-auth';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers[API_KEY_HEADER];
    const key = Array.isArray(header) ? header[0] : header;

    if (!key) {
      throw new UnauthorizedException('X-Auth sarlavhasi kerak');
    }

    const expected = this.configService.get<string>('EXTERNAL_API_KEY');
    if (!expected) {
      this.logger.error("EXTERNAL_API_KEY sozlanmagan — tashqi API so'rovlari rad etiladi");
      throw new UnauthorizedException('API kalit yaroqsiz');
    }

    if (!this.matches(key, expected)) {
      this.logger.warn(`Yaroqsiz API kalit bilan urinish: ${request.method} ${request.url}`);
      throw new UnauthorizedException('API kalit yaroqsiz');
    }

    return true;
  }

  /** Vaqt bo'yicha hujumlarni oldini olish uchun doimiy vaqtli solishtirish. */
  private matches(received: string, expected: string): boolean {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
