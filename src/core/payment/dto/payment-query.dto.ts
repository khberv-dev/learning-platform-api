import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';

export class PaymentQuery extends PaginationQuery {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  paymentTypeId?: string;

  @IsUUID()
  @IsOptional()
  enrollmentId?: string;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
