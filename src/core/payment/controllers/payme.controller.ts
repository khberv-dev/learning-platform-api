import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PaymeService } from '@/core/payment/services/payme.service';
import type { PaymeRequest } from '@/core/payment/dto/payme-request.dto';

/**
 * Payme (Paycom) Merchant API. Payme serverlari chaqiradi, JWT yo'q —
 * so'rov haqiqiyligi `Authorization: Basic` sarlavhasi orqali tekshiriladi.
 * Barcha metodlar bitta JSON-RPC endpoint orqali keladi.
 */
@ApiExcludeController()
@Public()
@Controller('payment/payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  @Post()
  @HttpCode(200)
  handle(@Headers('authorization') authorization: string | undefined, @Body() body: PaymeRequest) {
    return this.paymeService.handle(authorization, body);
  }
}
