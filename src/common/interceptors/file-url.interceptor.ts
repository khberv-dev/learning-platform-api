import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';

const UPLOAD_FOLDERS = [
  'avatar',
  'course',
  'lesson',
  'chat',
  'task-audio',
  'task-picture',
  'payment-type',
  'live-lesson-recording',
  'mentor-intro',
  'assessment-input',
  'assessment-output',
  'material',
];

const UPLOAD_PATH_RE = new RegExp(
  `^(${UPLOAD_FOLDERS.join('|')})/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9]+$`,
);

const MAX_DEPTH = 6;

@Injectable()
export class FileUrlInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(map((data) => this.resolve(data)));
  }

  private resolve(value: unknown, depth = 0): unknown {
    if (depth > MAX_DEPTH || value === null || value === undefined) return value;

    if (typeof value === 'string') {
      if (!UPLOAD_PATH_RE.test(value)) return value;
      const baseUrl = this.configService.getOrThrow<string>('FILES_BASE_URL');
      return `${baseUrl}/public/${value}`;
    }
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map((item) => this.resolve(item, depth + 1));
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, this.resolve(item, depth + 1)]),
      );
    }
    return value;
  }
}
