import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/courses')
export class StudentCourseController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('available')
  getAvailable(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.enrollmentService.getAvailableCourses(user.id, query);
  }

  @Get('me')
  getMyCourses(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.enrollmentService.getMyCourses(user.id, query);
  }
}
