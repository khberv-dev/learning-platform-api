import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';

const enrollmentExample = {
  id: 'en000000-0000-0000-0000-000000000001',
  start: '2026-05-18T00:00:00.000Z',
  end: '2026-08-18T00:00:00.000Z',
  student: { id: 'f2c8a0e0-1111-2222-3333-444455556666' },
  course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T10:00:00.000Z',
};

@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('enrollments')
export class AdminEnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: enrollmentExample } })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(dto);
  }
}
