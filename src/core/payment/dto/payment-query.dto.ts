import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';

export class PaymentQuery extends PaginationQuery {
  @ApiPropertyOptional({ example: 'f2c8a0e0-1111-2222-3333-444455556666' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'pt000000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsOptional()
  paymentTypeId?: string;

  @ApiPropertyOptional({ example: 'en000000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsOptional()
  enrollmentId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
