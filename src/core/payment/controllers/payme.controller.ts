import { All, Body, Controller, Headers, HttpCode, Req } from '@nestjs/common';

import type { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { PaymeService } from '@/core/payment/services/payme.service';
import type { PaymeRequest } from '@/core/payment/dto/payme-request.dto';

/**
 * Payme (Paycom) Merchant API. Payme serverlari chaqiradi, JWT yo'q —
 * so'rov haqiqiyligi `Authorization: Basic` sarlavhasi orqali tekshiriladi.
 * Barcha metodlar bitta JSON-RPC endpoint orqali keladi.
 *
 * `@All` ishlatiladi: POST bo'lmagan so'rovga spetsifikatsiya `-32300` ni
 * kutadi, Nest esa `@Post` da 404 qaytarardi.
 */

@Public()
@Controller('payment/payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  @All()
  @HttpCode(200)
  handle(
    @Req() request: Request,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: PaymeRequest,
  ) {
    if (request.method !== 'POST') return this.paymeService.rejectNonPost(body);
    return this.paymeService.handle(authorization, body);
  }
}
