import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { ClickService } from '@/core/payment/services/click.service';
import { ClickPrepareDto } from '@/core/payment/dto/click-prepare.dto';
import { ClickCompleteDto } from '@/core/payment/dto/click-complete.dto';

/**
 * Click Merchant API webhook'lari. Click serverlari chaqiradi, JWT yo'q —
 * so'rov haqiqiyligi `sign_string` orqali tekshiriladi.
 */
@ApiExcludeController()
@Public()
@Controller('payment/click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {}

  @Post('prepare')
  @HttpCode(200)
  prepare(@Body() dto: ClickPrepareDto) {
    return this.clickService.prepare(dto);
  }

  @Post('complete')
  @HttpCode(200)
  complete(@Body() dto: ClickCompleteDto) {
    return this.clickService.complete(dto);
  }
}
