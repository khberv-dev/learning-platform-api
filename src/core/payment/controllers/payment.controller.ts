import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentService } from '@/core/payment/services/payment.service';
import { RequestPaymentDto } from '@/core/payment/dto/request-payment.dto';
import { SelectPaymentTypeDto } from '@/core/payment/dto/select-payment-type.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('request')
  requestPayment(@CurrentUser() user: { id: string }, @Body() dto: RequestPaymentDto) {
    return this.paymentService.requestPayment(user.id, dto);
  }

  @Patch(':id/payment-type')
  selectPaymentType(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SelectPaymentTypeDto) {
    return this.paymentService.selectPaymentType(user.id, id, dto);
  }

  @Get('me')
  findMyPayments(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.paymentService.findMyPayments(user.id, query);
  }

  @Get(':id')
  findMyPayment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.paymentService.findMyPayment(user.id, id);
  }
}
