import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { EnrollmentQuery } from '@/core/enrollment/dto/enrollment-query.dto';

const enrollmentExample = {
  id: 'en000000-0000-0000-0000-000000000001',
  status: 'active',
  start: '2026-05-18T00:00:00.000Z',
  end: '2026-08-18T00:00:00.000Z',
  student: { id: 'f2c8a0e0-1111-2222-3333-444455556666' },
  course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T10:00:00.000Z',
};

const enrollmentListExample = {
  data: [
    {
      ...enrollmentExample,
      isExpired: false,
      student: {
        id: 'st000000-0000-0000-0000-000000000001',
        level: 'A1',
        user: { id: 'f2c8a0e0-1111-2222-3333-444455556666', firstName: 'Sevara', lastName: 'Karimova' },
      },
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

// `enrollments` — eski yo'l, moslik uchun saqlangan; `admin/enrollments` — asosiysi.
@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller(['admin/enrollments', 'enrollments'])
export class AdminEnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({
    summary: "Talabani kursga qo'lda yozish (to'lovsiz)",
    description:
      "To'lov yaratmasdan yozilishni darhol `active` holatida ochadi. `planId` berilsa muddat va narx tarifdan " +
      "olinadi; `courseId` bilan `end` sanasi majburiy. Mavjud (muddati tugagan yoki to'lov kutayotgan) yozilish " +
      'qayta faollashtiriladi — progress saqlanib qoladi.',
  })
  @ApiCreatedResponse({ schema: { example: enrollmentExample } })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(dto);
  }

  @Get()
  @ApiOperation({
    summary: "Yozilishlar ro'yxati",
    description:
      'Filtr: `studentId`, `courseId`, `status`, `isExpired`. Saralash: `sortBy` ' +
      '(`createdAt`, `updatedAt`, `start`, `end`, `status`) va `sortOrder` (`ASC` / `DESC`). ' +
      "Har bir yozuvda `isExpired` bo'ladi — `active` bo'lsa ham muddati tugagan bo'lishi mumkin.",
  })
  @ApiOkResponse({ schema: { example: enrollmentListExample } })
  findAll(@Query() query: EnrollmentQuery) {
    return this.enrollmentService.findAllEnrollments(query);
  }
}
