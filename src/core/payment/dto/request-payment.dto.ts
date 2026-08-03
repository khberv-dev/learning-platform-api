import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RequestPaymentDto {
  @ApiProperty({
    example: 'pl000000-0000-0000-0000-000000000001',
    description: 'Tarif (plan) id — kurs shundan olinadi',
  })
  @IsUUID()
  planId: string;
}
