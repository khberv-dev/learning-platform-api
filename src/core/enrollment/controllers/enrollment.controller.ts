import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('history')
  getHistory(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.enrollmentService.getHistory(user.id, query);
  }
}
