import { IsUUID } from 'class-validator';

export class RequestPaymentDto {
  @IsUUID()
  planId: string;
}
