import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuth } from '@/core/external/decorators/api-key-auth.decorator';
import { ExternalService } from '@/core/external/services/external.service';
import { SearchStudentsQuery } from '@/core/external/dto/search-students.query';
import { ExternalEnrollmentDto } from '@/core/external/dto/external-enrollment.dto';
import { CreatePendingEnrollmentDto } from '@/core/enrollment/dto/create-pending-enrollment.dto';

const studentListExample = {
  data: [
    {
      studentId: 'f2c8a0e0-1111-2222-3333-444455556666',
      userId: 'u0000000-0000-0000-0000-000000000001',
      firstName: 'Sevara',
      lastName: 'Karimova',
      phoneNumber: '998901234567',
      level: 'a1',
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const courseListExample = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    title: 'English A1',
    description: "Boshlang'ich daraja",
    plans: [
      {
        id: 'pl000000-0000-0000-0000-000000000001',
        title: 'Standart',
        price: 250000,
        month: 3,
        hasMentor: false,
      },
    ],
  },
];

const enrollmentExample = {
  id: 'en000000-0000-0000-0000-000000000001',
  status: 'active',
  start: '2026-05-18T00:00:00.000Z',
  end: '2026-08-18T00:00:00.000Z',
  course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
};

const pendingEnrollmentExample = {
  id: 'pe000000-0000-0000-0000-000000000001',
  status: 'created',
  start: '2026-05-18T00:00:00.000Z',
  end: null,
  user: { id: 'u0000000-0000-0000-0000-000000000001', firstName: 'Sevara', lastName: 'Karimova' },
  course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
  enrollment: null,
};

@ApiTags('external')
@ApiKeyAuth()
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('students')
  @ApiOperation({
    summary: "Talabalarni telefon raqami bo'yicha qidirish",
    description: "Raqamning bir qismi bo'yicha qidiradi. Kamida 4 ta raqam kerak.",
  })
  @ApiOkResponse({ schema: { example: studentListExample } })
  searchStudents(@Query() query: SearchStudentsQuery) {
    return this.externalService.searchStudentsByPhone(query);
  }

  @Get('courses')
  @ApiOperation({
    summary: "Faol kurslar va tariflar ro'yxati",
    description: "Yozilish ochishda kerak bo'ladigan `planId` / `courseId` shu yerdan olinadi.",
  })
  @ApiOkResponse({ schema: { example: courseListExample } })
  listCourses() {
    return this.externalService.listCourses();
  }

  @Post('enrollments')
  @ApiOperation({
    summary: "Talabani kursga yozish (to'langan summa bilan)",
    description:
      "Yozilishni darhol `active` holatida ochadi va `amount` ni to'lov tarixiga yozadi. " +
      '`planId` berilsa muddat tarifdan olinadi; `courseId` bilan `end` majburiy.',
  })
  @ApiCreatedResponse({ schema: { example: enrollmentExample } })
  createEnrollment(@Body() dto: ExternalEnrollmentDto) {
    return this.externalService.createEnrollment(dto);
  }

  @Post('pending-enrollments')
  @ApiOperation({
    summary: "Yozilish so'rovini yuborish (admin tasdig'i bilan)",
    description:
      "Yozilish darhol ochilmaydi: so'rov `created` holatida navbatga tushadi va admin uni tasdiqlaydi yoki " +
      "rad etadi. Tarif (`planId`) bu yerda so'ralmaydi — uni admin tasdiqlash paytida tanlaydi. " +
      "Takroriy so'rov yangi yozuv yaratmaydi, mavjud so'rovning sanalarini yangilaydi.",
  })
  @ApiCreatedResponse({ schema: { example: pendingEnrollmentExample } })
  createPendingEnrollment(@Body() dto: CreatePendingEnrollmentDto) {
    return this.externalService.createPendingEnrollment(dto);
  }

  @Get('pending-enrollments/:id')
  @ApiOperation({
    summary: "So'rov holatini tekshirish",
    description:
      "`status`: `created` — kutilmoqda, `accepted` — tasdiqlangan (`enrollment` to'ldirilgan), `rejected` — rad etilgan.",
  })
  @ApiOkResponse({ schema: { example: pendingEnrollmentExample } })
  findPendingEnrollment(@Param('id') id: string) {
    return this.externalService.findPendingEnrollment(id);
  }
}
