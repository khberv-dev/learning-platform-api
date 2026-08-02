import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectPaymentTypeDto {
  @ApiProperty({ example: 'pt000000-0000-0000-0000-000000000001' })
  @IsUUID()
  paymentTypeId: string;
}
