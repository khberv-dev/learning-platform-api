import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PlanService } from '@/core/plan/services/plan.service';

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
@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
@Controller('courses/:courseId/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @ApiOkResponse({ schema: { example: [planExample] } })
  listActivePlans(@Param('courseId') courseId: string) {
    return this.planService.listActivePlans(courseId);
  }
}
