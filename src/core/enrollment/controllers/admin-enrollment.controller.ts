import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { EnrollmentQuery } from '@/core/enrollment/dto/enrollment-query.dto';

// `enrollments` — eski yo'l, moslik uchun saqlangan; `admin/enrollments` — asosiysi.

@Roles(UserRole.ADMIN)
@Controller(['admin/enrollments', 'enrollments'])
export class AdminEnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(dto);
  }

  @Get()
  findAll(@Query() query: EnrollmentQuery) {
    return this.enrollmentService.findAllEnrollments(query);
  }
}
