import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { Student } from '@/core/user/entity/student.entity';
import { CourseModule } from '@/core/course/course.module';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { StudentCourseController } from '@/core/enrollment/controllers/student-course.controller';
import { EnrollmentController } from '@/core/enrollment/controllers/enrollment.controller';
import { AdminEnrollmentController } from '@/core/enrollment/controllers/admin-enrollment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Progress, EnrollmentHistory, Student]), CourseModule],
  controllers: [StudentCourseController, EnrollmentController, AdminEnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
