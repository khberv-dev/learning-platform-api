import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { Purchase } from '@/core/payment/entity/purchase.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { RequestPaymentDto } from '@/core/payment/dto/request-payment.dto';
import { SelectPaymentTypeDto } from '@/core/payment/dto/select-payment-type.dto';
import { PaymentQuery } from '@/core/payment/dto/payment-query.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';
import { buildPaymentUrl, resolvePlan } from '@/core/payment/utils/payment-url.util';
import { PushService } from '@/core/notification/services/push.service';

const paymentRelations = {
  paymentType: true,
  student: true,
  purchases: { subscription: { plan: { course: true } } },
} as const;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function withResolvedUrl(payment: Payment): Payment {
  if (!payment.paymentType) return payment;
  return {
    ...payment,
    paymentType: { ...payment.paymentType, url: buildPaymentUrl(payment.paymentType.url, payment) },
  };
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentType) private readonly paymentTypeRepo: Repository<PaymentType>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Purchase) private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentHistory) private readonly historyRepo: Repository<EnrollmentHistory>,
    private readonly pushService: PushService,
  ) {}

  async requestPayment(studentId: string, dto: RequestPaymentDto) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
      relations: { course: true },
    });
    if (!plan) throw new NotFoundException('Tarif topilmadi');
    if (!plan.course.isActive) throw new NotFoundException('Kurs topilmadi');

    const alreadyEnrolled = await this.enrollmentRepo.exists({
      where: { student: { id: student.id }, course: { id: plan.course.id }, status: EnrollmentStatus.ACTIVE },
    });
    if (alreadyEnrolled) throw new BadRequestException('Siz allaqachon ushbu kursga yozilgansiz');

    let payment = await this.paymentRepo.findOne({
      where: {
        student: { id: studentId },
        status: PaymentStatus.CREATED,
        purchases: { subscription: { plan: { course: { id: plan.course.id } } } },
      },
      relations: paymentRelations,
    });

    if (payment) {
      const subscription = payment.purchases[0]?.subscription ?? null;
      if (payment.amount !== plan.price) {
        payment.amount = plan.price;
        payment = await this.paymentRepo.save(payment);
      }
      if (subscription && subscription.plan?.id !== plan.id) {
        subscription.plan = plan;
        await this.subscriptionRepo.save(subscription);
      }
      payment = await this.findOnePayment(payment.id);
    } else {
      const created = await this.paymentRepo.save({
        student: { id: studentId },
        amount: plan.price,
      });
      const subscription = await this.subscriptionRepo.save({ student, plan, start: null, end: null });
      await this.purchaseRepo.save({ payment: created, subscription });
      payment = await this.findOnePayment(created.id);
    }

    const types = await this.paymentTypeRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    const paymentTypes = types.map((type) => ({ ...type, url: buildPaymentUrl(type.url, payment) }));

    return { payment: withResolvedUrl(payment), paymentTypes };
  }

  async selectPaymentType(studentId: string, paymentId: string, dto: SelectPaymentTypeDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, student: { id: studentId } },
      relations: paymentRelations,
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    if (payment.status !== PaymentStatus.CREATED) {
      throw new BadRequestException("Yakunlangan to'lovni o'zgartirib bo'lmaydi");
    }

    const paymentType = await this.paymentTypeRepo.findOne({ where: { id: dto.paymentTypeId } });
    if (!paymentType) throw new NotFoundException("To'lov turi topilmadi");
    if (!paymentType.isActive) throw new BadRequestException("To'lov turi faol emas");

    payment.paymentType = paymentType;
    return withResolvedUrl(await this.paymentRepo.save(payment));
  }

  async markPaid(payment: Payment): Promise<Payment> {
    const plan = resolvePlan(payment);

    if (plan) {
      const course = plan.course;
      const existing = await this.enrollmentRepo.findOne({
        where: { student: { id: payment.student.id }, course: { id: course.id } },
      });

      const enrollment = existing ?? this.enrollmentRepo.create({ student: payment.student, course });
      const start = enrollment.start ?? new Date();
      enrollment.status = EnrollmentStatus.ACTIVE;
      enrollment.start = start;
      await this.enrollmentRepo.save(enrollment);

      await this.historyRepo.save({
        enrollment,
        purchaseAmount: payment.amount,
        start,
      });

      const subscription = payment.purchases[0]?.subscription;
      if (subscription) {
        const subscriptionStart = new Date();
        subscription.start = subscriptionStart;
        subscription.end = addMonths(subscriptionStart, plan.month);
        await this.subscriptionRepo.save(subscription);
      }

      void this.pushService.notifyCourseEnrolled(payment.student.id, course.id, course.title);
    }

    payment.status = PaymentStatus.PAID;
    return this.paymentRepo.save(payment);
  }

  async markCancelled(payment: Payment): Promise<Payment> {
    const plan = resolvePlan(payment);
    if (plan) {
      const enrollment = await this.enrollmentRepo.findOne({
        where: { student: { id: payment.student.id }, course: { id: plan.course.id } },
      });
      if (enrollment) {
        enrollment.status = EnrollmentStatus.CANCELLED;
        await this.enrollmentRepo.save(enrollment);
      }
    }
    payment.status = PaymentStatus.CANCELLED;
    return this.paymentRepo.save(payment);
  }

  async findAllPayments(query: PaymentQuery): Promise<Paginated<Payment>> {
    const where: FindOptionsWhere<Payment> = {};
    if (query.studentId) where.student = { id: query.studentId };
    if (query.paymentTypeId) where.paymentType = { id: query.paymentTypeId };
    if (query.planId) where.purchases = { subscription: { plan: { id: query.planId } } };
    if (query.status) where.status = query.status;

    const [data, total] = await this.paymentRepo.findAndCount({
      where,
      relations: paymentRelations,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findMyPayments(studentId: string, query: PaginationQuery): Promise<Paginated<Payment>> {
    const [data, total] = await this.paymentRepo.findAndCount({
      where: { student: { id: studentId } },
      relations: paymentRelations,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data.map(withResolvedUrl), total, query);
  }

  async findOnePayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id }, relations: paymentRelations });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return payment;
  }

  async findMyPayment(studentId: string, id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, student: { id: studentId } },
      relations: paymentRelations,
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return withResolvedUrl(payment);
  }
}
