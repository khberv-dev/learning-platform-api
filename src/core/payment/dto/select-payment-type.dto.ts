import { IsUUID } from 'class-validator';

export class SelectPaymentTypeDto {
  @IsUUID()
  paymentTypeId: string;
}
