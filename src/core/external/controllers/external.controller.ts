import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { ApiKeyAuth } from '@/core/external/decorators/api-key-auth.decorator';
import { ExternalService } from '@/core/external/services/external.service';
import { SearchStudentsQuery } from '@/core/external/dto/search-students.query';
import { ExternalEnrollmentDto } from '@/core/external/dto/external-enrollment.dto';
import { CreatePendingEnrollmentDto } from '@/core/enrollment/dto/create-pending-enrollment.dto';

@ApiKeyAuth()
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('students')
  searchStudents(@Query() query: SearchStudentsQuery) {
    return this.externalService.searchStudentsByPhone(query);
  }

  @Get('courses')
  listCourses() {
    return this.externalService.listCourses();
  }

  @Post('enrollments')
  createEnrollment(@Body() dto: ExternalEnrollmentDto) {
    return this.externalService.createEnrollment(dto);
  }

  @Post('pending-enrollments')
  createPendingEnrollment(@Body() dto: CreatePendingEnrollmentDto) {
    return this.externalService.createPendingEnrollment(dto);
  }

  @Get('pending-enrollments/:id')
  findPendingEnrollment(@Param('id') id: string) {
    return this.externalService.findPendingEnrollment(id);
  }
}
