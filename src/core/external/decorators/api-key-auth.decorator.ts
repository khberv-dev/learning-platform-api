import { applyDecorators, UseGuards } from '@nestjs/common';

import { Public } from '@/common/decorators/public.decorator';
import { ApiKeyGuard } from '@/core/external/guards/api-key.guard';

/**
 * JWT o'rniga `X-Auth` kaliti bilan himoyalash. `@Public()` global JWT
 * guard'ini o'tkazib yuboradi, so'ng `ApiKeyGuard` kalitni tekshiradi.
 */
export const ApiKeyAuth = () => applyDecorators(Public(), UseGuards(ApiKeyGuard));
