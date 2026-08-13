import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { PaymeTransaction } from '@/core/payment/entity/payme-transaction.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { PaymentService } from '@/core/payment/services/payment.service';
import { PaymentTypeService } from '@/core/payment/services/payment-type.service';
import { ClickService } from '@/core/payment/services/click.service';
import { PaymeService } from '@/core/payment/services/payme.service';
import { AdminPaymentTypeController } from '@/core/payment/controllers/admin-payment-type.controller';
import { AdminPaymentController } from '@/core/payment/controllers/admin-payment.controller';
import { PaymentController } from '@/core/payment/controllers/payment.controller';
import { ClickController } from '@/core/payment/controllers/click.controller';
import { PaymeController } from '@/core/payment/controllers/payme.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentType, PaymeTransaction, Plan, Student, Enrollment, EnrollmentHistory]),
  ],
  controllers: [
    AdminPaymentTypeController,
    AdminPaymentController,
    PaymentController,
    ClickController,
    PaymeController,
  ],
  providers: [PaymentTypeService, PaymentService, ClickService, PaymeService],
})
export class PaymentModule {}
