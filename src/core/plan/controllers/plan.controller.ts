import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PlanService } from '@/core/plan/services/plan.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT, UserRole.MENTOR)
@Controller(['student/courses/:courseId/plans', 'mentor/courses/:courseId/plans'])
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  listActivePlans(@Param('courseId') courseId: string, @Query() query: PaginationQuery) {
    return this.planService.listActivePlans(courseId, query);
  }
}
