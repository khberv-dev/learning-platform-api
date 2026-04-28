import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/service/enrollment.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('history')
  getHistory(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getHistory(user.id);
  }
}
