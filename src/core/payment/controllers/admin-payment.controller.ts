import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentService } from '@/core/payment/services/payment.service';
import { PaymentQuery } from '@/core/payment/dto/payment-query.dto';

const paymentExample = {
  id: 'pa000000-0000-0000-0000-000000000001',
  amount: 250000,
  status: 'created',
  paymentType: {
    id: 'pt000000-0000-0000-0000-000000000001',
    icon: '/payment-type/payme.png',
    title: 'Payme',
    url: 'https://payme.uz/checkout',
    isActive: true,
  },
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

const paymentListExample = {
  data: [paymentExample],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

/**
 * Admin uchun to'lovlar — faqat ko'rish. To'lov holatini o'zgartirish yoki
 * o'chirish yo'q: holat faqat to'lov tizimi (Click) webhook'lari orqali
 * o'zgaradi.
 */
@ApiTags('payments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOkResponse({ schema: { example: paymentListExample } })
  findAllPayments(@Query() query: PaymentQuery) {
    return this.paymentService.findAllPayments(query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: paymentExample } })
  findOnePayment(@Param('id') id: string) {
    return this.paymentService.findOnePayment(id);
  }
}
