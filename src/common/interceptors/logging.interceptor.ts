import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { isDevelopment } from '@/shared/config/environment.config';

const SECRET_KEYS = /password|token|secret|authorization|sign_string|fcmToken|apiKey/i;

const MAX_BODY_CHARS = 2000;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = isDevelopment(this.configService);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled || context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const label = `${request.method} ${request.originalUrl}`;

    this.logger.log(`--> ${label} ${this.format(request.body)}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logger.log(`<-- ${label} ${response.statusCode} ${Date.now() - startedAt}ms ${this.format(data)}`);
        },
        error: (error: Error & { status?: number }) => {
          this.logger.warn(`<-- ${label} ${error.status ?? 500} ${Date.now() - startedAt}ms ${error.message}`);
        },
      }),
    );
  }

  private format(payload: unknown): string {
    if (payload === undefined || payload === null) return '';
    try {
      const text = JSON.stringify(this.redact(payload));
      if (!text) return '';
      return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}…` : text;
    } catch {
      return "[serialize qilib bo'lmadi]";
    }
  }

  private redact(value: unknown, depth = 0): unknown {
    if (depth > 5 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => this.redact(item, depth + 1));
    if (value instanceof Date) return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEYS.test(key) ? '***' : this.redact(item, depth + 1),
      ]),
    );
  }
}
