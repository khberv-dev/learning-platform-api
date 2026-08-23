import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentTypeDto } from '@/core/payment/dto/create-payment-type.dto';

export class UpdatePaymentTypeDto extends PartialType(CreatePaymentTypeDto) {}
