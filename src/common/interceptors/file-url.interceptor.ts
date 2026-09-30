import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, concatMap, map } from 'rxjs';
import { expandFileUrls } from '@/common/utils/file-url.util';

class JsonNull {
  toJSON(): null {
    return null;
  }
}

@Injectable()
export class FileUrlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      concatMap((data) => expandFileUrls(data)),
      map((data) => (data === null ? new JsonNull() : data)),
    );
  }
}
