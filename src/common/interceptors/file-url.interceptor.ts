import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import { expandFileUrls } from '@/common/utils/file-url.util';

class JsonNull {
  toJSON(): null {
    return null;
  }
}

@Injectable()
export class FileUrlInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      map((data) => expandFileUrls(data, () => this.configService.getOrThrow('FILES_BASE_URL'))),
      map((data) => (data === null ? new JsonNull() : data)),
    );
  }
}
