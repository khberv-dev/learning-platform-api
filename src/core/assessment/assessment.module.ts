import { Module } from '@nestjs/common';
import { AssessmentController } from '@/core/assessment/controllers/assessment.controller';

@Module({
  controllers: [AssessmentController],
})
export class AssessmentModule {}
