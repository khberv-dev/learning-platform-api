import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Course } from '@/core/course/entity/course.entity';
import { PlanService } from '@/core/plan/services/plan.service';
import { AdminPlanController } from '@/core/plan/controllers/admin-plan.controller';
import { PlanController } from '@/core/plan/controllers/plan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Course])],
  controllers: [AdminPlanController, PlanController],
  providers: [PlanService],
})
export class PlanModule {}
