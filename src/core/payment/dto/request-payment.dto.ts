import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RequestPaymentDto {
  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  courseId: string;
}
