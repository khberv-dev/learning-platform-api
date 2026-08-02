import { PartialType } from '@nestjs/swagger';
import { CreatePaymentTypeDto } from '@/core/payment/dto/create-payment-type.dto';

export class UpdatePaymentTypeDto extends PartialType(CreatePaymentTypeDto) {}
