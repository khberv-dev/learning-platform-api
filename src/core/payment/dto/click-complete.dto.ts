import { IsOptional, IsString } from 'class-validator';
import { ClickPrepareDto, asString } from '@/core/payment/dto/click-prepare.dto';

export class ClickCompleteDto extends ClickPrepareDto {
  @asString()
  @IsString()
  @IsOptional()
  merchant_prepare_id?: string;
}
