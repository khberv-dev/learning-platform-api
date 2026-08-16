import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PendingEnrollmentService } from '@/core/enrollment/services/pending-enrollment.service';
import { AcceptPendingEnrollmentDto } from '@/core/enrollment/dto/accept-pending-enrollment.dto';
import { PendingEnrollmentQuery } from '@/core/enrollment/dto/pending-enrollment-query.dto';

const pendingExample = {
  id: 'pe000000-0000-0000-0000-000000000001',
  status: 'created',
  start: '2026-05-18T00:00:00.000Z',
  end: null,
  user: { id: 'u0000000-0000-0000-0000-000000000001', firstName: 'Sevara', lastName: 'Karimova' },
  course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
  enrollment: null,
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T10:00:00.000Z',
};

const pendingListExample = {
  data: [pendingExample],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const acceptedExample = {
  ...pendingExample,
  status: 'accepted',
  enrollment: {
    id: 'en000000-0000-0000-0000-000000000001',
    status: 'active',
    start: '2026-05-18T00:00:00.000Z',
    end: '2026-08-18T00:00:00.000Z',
  },
  payment: {
    id: 'pa000000-0000-0000-0000-000000000001',
    status: 'paid',
    amount: 250000,
    plan: { id: 'pl000000-0000-0000-0000-000000000001', title: 'Standart' },
  },
};

@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/pending-enrollments')
export class AdminPendingEnrollmentController {
  constructor(private readonly pendingEnrollmentService: PendingEnrollmentService) {}

  @Get()
  @ApiOperation({
    summary: "Kutilayotgan yozilish so'rovlari",
    description:
      'Filtr: `userId`, `courseId`, `status` (`created`, `accepted`, `rejected`). ' +
      'Saralash: `sortBy` (`createdAt`, `updatedAt`, `start`, `end`, `status`) va `sortOrder` (`ASC` / `DESC`).',
  })
  @ApiOkResponse({ schema: { example: pendingListExample } })
  findAll(@Query() query: PendingEnrollmentQuery) {
    return this.pendingEnrollmentService.findAllPending(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Bitta so'rov" })
  @ApiOkResponse({ schema: { example: pendingExample } })
  findOne(@Param('id') id: string) {
    return this.pendingEnrollmentService.findOnePending(id);
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: "So'rovni tasdiqlash",
    description:
      "Yozilishni `active` holatida ochadi, tanlangan tarif bilan to'langan (`paid`) to'lov yozuvini yaratadi " +
      "va tarixga yozuv qo'shadi. Tarif so'rovdagi kursga tegishli bo'lishi shart. " +
      "Faqat `created` holatidagi so'rov tasdiqlanadi.",
  })
  @ApiOkResponse({ schema: { example: acceptedExample } })
  accept(@Param('id') id: string, @Body() dto: AcceptPendingEnrollmentDto) {
    return this.pendingEnrollmentService.acceptPending(id, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: "So'rovni rad etish",
    description: "Yozilish ham, to'lov ham yaratilmaydi. Faqat `created` holatidagi so'rov rad etiladi.",
  })
  @ApiOkResponse({ schema: { example: { ...pendingExample, status: 'rejected' } } })
  reject(@Param('id') id: string) {
    return this.pendingEnrollmentService.rejectPending(id);
  }
}
