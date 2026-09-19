import { applyDecorators, UseGuards } from '@nestjs/common';

import { Public } from '@/common/decorators/public.decorator';
import { ApiKeyGuard } from '@/core/external/guards/api-key.guard';

export const ApiKeyAuth = () => applyDecorators(Public(), UseGuards(ApiKeyGuard));
