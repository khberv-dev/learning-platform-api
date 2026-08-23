import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { Period, StatsService } from '@/core/stats/stats.service';
import { BadRequestException } from '@nestjs/common';

const VALID_PERIODS: Period[] = [7, 14, 30];

@Roles(UserRole.ADMIN)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  getSummary() {
    return this.statsService.getSummary();
  }

  @Get('timeseries')
  getTimeseries(@Query('period', new ParseIntPipe({ optional: true })) period?: number) {
    const p = (period ?? 30) as Period;
    if (!VALID_PERIODS.includes(p)) {
      throw new BadRequestException('period must be 7, 14, or 30');
    }
    return this.statsService.getTimeseries(p);
  }
}
