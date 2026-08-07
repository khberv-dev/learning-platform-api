import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { EnrollmentModule } from '@/core/enrollment/enrollment.module';
import { ExternalService } from '@/core/external/services/external.service';
import { ApiKeyGuard } from '@/core/external/guards/api-key.guard';
import { ExternalController } from '@/core/external/controllers/external.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), EnrollmentModule],
  controllers: [ExternalController],
  providers: [ExternalService, ApiKeyGuard],
})
export class ExternalModule {}
