import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PlanService } from '@/core/plan/services/plan.service';
import { CreatePlanDto } from '@/core/plan/dto/create-plan.dto';
import { UpdatePlanDto } from '@/core/plan/dto/update-plan.dto';

const planExample = {
  id: 'pl000000-0000-0000-0000-000000000001',
  title: 'Standart',
  price: 250000,
  month: 3,
  hasMentor: false,
  isActive: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('plans')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/courses/:courseId/plans')
export class AdminPlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: planExample } })
  createPlan(@Param('courseId') courseId: string, @Body() dto: CreatePlanDto) {
    return this.planService.createPlan(courseId, dto);
  }

  @Get()
  @ApiOkResponse({ schema: { example: [planExample] } })
  listPlans(@Param('courseId') courseId: string) {
    return this.planService.listPlans(courseId);
  }

  @Get(':planId')
  @ApiOkResponse({ schema: { example: planExample } })
  findOnePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.findOnePlan(courseId, planId);
  }

  @Patch(':planId')
  @ApiOkResponse({ schema: { example: planExample } })
  updatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string, @Body() dto: UpdatePlanDto) {
    return this.planService.updatePlan(courseId, planId, dto);
  }

  @Patch(':planId/activate')
  @ApiOkResponse({ schema: { example: planExample } })
  activatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.setActive(courseId, planId, true);
  }

  @Patch(':planId/deactivate')
  @ApiOkResponse({ schema: { example: { ...planExample, isActive: false } } })
  deactivatePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.setActive(courseId, planId, false);
  }

  @Delete(':planId')
  @HttpCode(204)
  @ApiNoContentResponse()
  deletePlan(@Param('courseId') courseId: string, @Param('planId') planId: string) {
    return this.planService.deletePlan(courseId, planId);
  }
}
