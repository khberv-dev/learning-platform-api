import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { PaymentService } from '@/core/payment/services/payment.service';
import { PaymentTypeService } from '@/core/payment/services/payment-type.service';
import { ClickService } from '@/core/payment/services/click.service';
import { AdminPaymentTypeController } from '@/core/payment/controllers/admin-payment-type.controller';
import { AdminPaymentController } from '@/core/payment/controllers/admin-payment.controller';
import { PaymentController } from '@/core/payment/controllers/payment.controller';
import { ClickController } from '@/core/payment/controllers/click.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentType, Plan, Student, Enrollment, EnrollmentHistory])],
  controllers: [AdminPaymentTypeController, AdminPaymentController, PaymentController, ClickController],
  providers: [PaymentTypeService, PaymentService, ClickService],
})
export class PaymentModule {}
