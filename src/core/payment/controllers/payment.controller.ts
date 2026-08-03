import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentService } from '@/core/payment/services/payment.service';
import { RequestPaymentDto } from '@/core/payment/dto/request-payment.dto';
import { SelectPaymentTypeDto } from '@/core/payment/dto/select-payment-type.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const paymentExample = {
  id: 'pa000000-0000-0000-0000-000000000001',
  amount: 250000,
  status: 'created',
  paymentType: null,
  user: { id: 'f2c8a0e0-1111-2222-3333-444455556666', firstName: 'Sevara', lastName: 'Karimova' },
  enrollment: {
    id: 'en000000-0000-0000-0000-000000000001',
    status: 'created',
    start: null,
    end: null,
    course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
  },
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T10:00:00.000Z',
};

const requestExample = {
  payment: paymentExample,
  paymentTypes: [
    {
      id: 'pt000000-0000-0000-0000-000000000001',
      icon: '/payment-type/payme.png',
      title: 'Payme',
      url: 'https://payme.uz/checkout',
      isActive: true,
    },
  ],
};

const paymentListExample = {
  data: [paymentExample],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

@ApiTags('payments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('request')
  @ApiOperation({
    summary: "Kurs uchun to'lov so'rovi",
    description:
      "Kurs uchun 'created' holatidagi yozilish va to'lov yaratadi va faol to'lov turlarini qaytaradi. " +
      "Takroriy so'rov mavjud kutilayotgan to'lovni qaytaradi.",
  })
  @ApiCreatedResponse({ schema: { example: requestExample } })
  requestPayment(@CurrentUser() user: { id: string }, @Body() dto: RequestPaymentDto) {
    return this.paymentService.requestPayment(user.id, dto);
  }

  @Patch(':id/payment-type')
  @ApiOperation({ summary: "Kutilayotgan to'lov uchun to'lov turini tanlash" })
  @ApiOkResponse({ schema: { example: paymentExample } })
  selectPaymentType(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SelectPaymentTypeDto) {
    return this.paymentService.selectPaymentType(user.id, id, dto);
  }

  @Get('me')
  @ApiOkResponse({ schema: { example: paymentListExample } })
  findMyPayments(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.paymentService.findMyPayments(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: paymentExample } })
  findMyPayment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.paymentService.findMyPayment(user.id, id);
  }
}
