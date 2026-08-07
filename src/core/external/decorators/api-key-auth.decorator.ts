import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ApiKeyGuard } from '@/core/external/guards/api-key.guard';

export const API_KEY_SECURITY = 'X-Auth';

/**
 * JWT o'rniga `X-Auth` kaliti bilan himoyalash. `@Public()` global JWT
 * guard'ini o'tkazib yuboradi, so'ng `ApiKeyGuard` kalitni tekshiradi.
 */
export const ApiKeyAuth = () =>
  applyDecorators(
    Public(),
    UseGuards(ApiKeyGuard),
    ApiSecurity(API_KEY_SECURITY),
    ApiUnauthorizedResponse({
      schema: { example: { message: 'API kalit yaroqsiz', statusCode: 401 } },
    }),
  );
