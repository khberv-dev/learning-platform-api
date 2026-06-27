import { Module } from '@nestjs/common';
import { StatsService } from '@/core/stats/stats.service';
import { StatsController } from '@/core/stats/stats.controller';

@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
