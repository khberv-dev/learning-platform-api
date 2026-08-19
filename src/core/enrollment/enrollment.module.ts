import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { PendingEnrollment } from '@/core/enrollment/entity/pending-enrollment.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Payment } from '@/core/payment/entity/payment.entity';
import { CourseModule } from '@/core/course/course.module';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { PendingEnrollmentService } from '@/core/enrollment/services/pending-enrollment.service';
import { StudentCourseController } from '@/core/enrollment/controllers/student-course.controller';
import { EnrollmentController } from '@/core/enrollment/controllers/enrollment.controller';
import { AdminEnrollmentController } from '@/core/enrollment/controllers/admin-enrollment.controller';
import { AdminPendingEnrollmentController } from '@/core/enrollment/controllers/admin-pending-enrollment.controller';
import { NotificationModule } from '@/core/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Progress,
      EnrollmentHistory,
      PendingEnrollment,
      Student,
      Course,
      Plan,
      Payment,
    ]),
    CourseModule,
    NotificationModule,
  ],
  controllers: [
    StudentCourseController,
    EnrollmentController,
    AdminEnrollmentController,
    AdminPendingEnrollmentController,
  ],
  providers: [EnrollmentService, PendingEnrollmentService],
  exports: [EnrollmentService, PendingEnrollmentService],
})
export class EnrollmentModule {}
