import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { Period, StatsService } from '@/core/stats/stats.service';
import { BadRequestException } from '@nestjs/common';

const VALID_PERIODS: Period[] = [7, 14, 30];

@ApiTags('stats')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  @ApiOkResponse({
    schema: {
      example: { users: 120, assignments: 45, enrollments: 300, mentors: 18 },
    },
  })
  getSummary() {
    return this.statsService.getSummary();
  }

  @Get('timeseries')
  @ApiQuery({ name: 'period', enum: [7, 14, 30], required: false, description: 'Number of days (default: 30)' })
  @ApiOkResponse({
    schema: {
      example: [
        { date: '2026-05-28', users: 3, assignments: 2, enrollments: 5, mentors: 1 },
        { date: '2026-05-29', users: 0, assignments: 0, enrollments: 0, mentors: 0 },
      ],
    },
  })
  getTimeseries(
    @Query('period', new ParseIntPipe({ optional: true })) period?: number,
  ) {
    const p = (period ?? 30) as Period;
    if (!VALID_PERIODS.includes(p)) {
      throw new BadRequestException('period must be 7, 14, or 30');
    }
    return this.statsService.getTimeseries(p);
  }
}
