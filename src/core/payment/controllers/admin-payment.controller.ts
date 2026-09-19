import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentService } from '@/core/payment/services/payment.service';
import { PaymentQuery } from '@/core/payment/dto/payment-query.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAllPayments(@Query() query: PaymentQuery) {
    return this.paymentService.findAllPayments(query);
  }

  @Get(':id')
  findOnePayment(@Param('id') id: string) {
    return this.paymentService.findOnePayment(id);
  }
}
