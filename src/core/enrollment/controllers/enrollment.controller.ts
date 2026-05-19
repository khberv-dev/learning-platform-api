import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';

const historyExample = [
  {
    id: 'eh000000-0000-0000-0000-000000000001',
    enrollment: {
      id: 'en000000-0000-0000-0000-000000000001',
      start: '2026-05-18T00:00:00.000Z',
      end: '2026-08-18T00:00:00.000Z',
      course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
    },
    purchaseAmount: 250000,
    createdAt: '2026-05-18T10:00:00.000Z',
  },
];

@ApiTags('enrollments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('history')
  @ApiOkResponse({ schema: { example: historyExample } })
  getHistory(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getHistory(user.id);
  }
}
