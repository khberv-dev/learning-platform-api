import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/service/enrollment.service';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';

@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('enrollments')
export class AdminEnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(dto);
  }
}
