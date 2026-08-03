import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ClickPrepareDto, asString } from '@/core/payment/dto/click-prepare.dto';

export class ClickCompleteDto extends ClickPrepareDto {
  @ApiProperty({
    example: 'pa000000-0000-0000-0000-000000000001',
    description: "Prepare bosqichida qaytarilgan to'lov (payment) id",
  })
  @asString()
  @IsString()
  @IsOptional()
  merchant_prepare_id?: string;
}
