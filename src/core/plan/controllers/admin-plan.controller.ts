import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PlanService } from '@/core/plan/services/plan.service';
import { CreatePlanDto } from '@/core/plan/dto/create-plan.dto';
import { UpdatePlanDto } from '@/core/plan/dto/update-plan.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/courses/:courseId/plans')
export class AdminPlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  createPlan(@Param('courseId') courseId: string, @Body() dto: CreatePlanDto) {
    return this.planService.createPlan(courseId, dto);
  }

  @Get()
  listPlans(@Param('courseId') courseId: string) {
    return this.planService.listPlans(courseId);
  }

  @Get(':planId')
  findOnePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.findOnePlan(courseId, planId);
  }

  @Patch(':planId')
  updatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string, @Body() dto: UpdatePlanDto) {
    return this.planService.updatePlan(courseId, planId, dto);
  }

  @Patch(':planId/activate')
  activatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.setActive(courseId, planId, true);
  }

  @Patch(':planId/deactivate')
  deactivatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.setActive(courseId, planId, false);
  }

  @Delete(':planId')
  @HttpCode(204)
  deletePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.deletePlan(courseId, planId);
  }
}
