import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Course } from '@/core/course/entity/course.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { PaymentService } from '@/core/payment/services/payment.service';
import { PaymentTypeService } from '@/core/payment/services/payment-type.service';
import { AdminPaymentTypeController } from '@/core/payment/controllers/admin-payment-type.controller';
import { AdminPaymentController } from '@/core/payment/controllers/admin-payment.controller';
import { PaymentController } from '@/core/payment/controllers/payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentType, Student, Course, Enrollment, EnrollmentHistory])],
  controllers: [AdminPaymentTypeController, AdminPaymentController, PaymentController],
  providers: [PaymentTypeService, PaymentService],
})
export class PaymentModule {}
