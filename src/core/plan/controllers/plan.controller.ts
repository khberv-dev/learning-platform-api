import { Controller, Get, Param } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PlanService } from '@/core/plan/services/plan.service';

@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
@Controller('courses/:courseId/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  listActivePlans(@Param('courseId') courseId: string) {
    return this.planService.listActivePlans(courseId);
  }
}
