import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/service/enrollment.service';

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('courses')
export class StudentCourseController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('available')
  getAvailable(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getAvailableCourses(user.id);
  }

  @Get('me')
  getMyCourses(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getMyCourses(user.id);
  }
}
