import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { RequestPaymentDto } from '@/core/payment/dto/request-payment.dto';
import { SelectPaymentTypeDto } from '@/core/payment/dto/select-payment-type.dto';
import { UpdatePaymentStatusDto } from '@/core/payment/dto/update-payment-status.dto';
import { PaymentQuery } from '@/core/payment/dto/payment-query.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';
import { buildPaymentUrl } from '@/core/payment/utils/payment-url.util';

const paymentRelations = {
  paymentType: true,
  user: true,
  plan: true,
  enrollment: { course: true },
} as const;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** To'lovga biriktirilgan to'lov turining shablon url'ini to'ldirib qaytaradi. */
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
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentHistory) private readonly historyRepo: Repository<EnrollmentHistory>,
  ) {}

  /**
   * Tarif (plan) uchun to'lov so'rovi: yozilish (created) va to'lov (created)
   * yaratiladi, javobda esa faol to'lov turlari qaytariladi. Takroriy so'rov
   * mavjud kutilayotgan to'lovni qaytaradi.
   */
  async requestPayment(userId: string, dto: RequestPaymentDto) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const plan = await this.planRepo.findOne({
      where: { id: dto.planId, isActive: true },
      relations: { course: true },
    });
    if (!plan) throw new NotFoundException('Tarif topilmadi');
    if (!plan.course.isActive) throw new NotFoundException('Kurs topilmadi');

    const existing = await this.enrollmentRepo.findOne({
      where: {
        student: { id: student.id },
        course: { id: plan.course.id },
        status: In([EnrollmentStatus.CREATED, EnrollmentStatus.ACTIVE]),
      },
      relations: { course: true },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE && !isEnrollmentExpired(existing)) {
      throw new BadRequestException('Siz allaqachon ushbu kursga yozilgansiz');
    }

    let enrollment: Enrollment;
    if (!existing) {
      enrollment = await this.enrollmentRepo.save({ student, course: plan.course });
    } else if (existing.status === EnrollmentStatus.ACTIVE) {
      // Muddati tugagan yozilish qayta sotib olinmoqda: kutish holatiga qaytariladi.
      // Eski muddat `enrollment_histories` da saqlanib qoladi.
      existing.status = EnrollmentStatus.CREATED;
      existing.start = null;
      existing.end = null;
      enrollment = await this.enrollmentRepo.save(existing);
    } else {
      enrollment = existing;
    }

    let payment = await this.paymentRepo.findOne({
      where: { enrollment: { id: enrollment.id }, status: PaymentStatus.CREATED },
      relations: paymentRelations,
    });

    if (payment) {
      // Foydalanuvchi boshqa tarifni tanlagan bo'lsa, kutilayotgan to'lov yangilanadi.
      if (payment.plan?.id !== plan.id || payment.amount !== plan.price) {
        payment.plan = plan;
        payment.amount = plan.price;
        payment = await this.paymentRepo.save(payment);
      }
    } else {
      const created = await this.paymentRepo.save({ user: { id: userId }, enrollment, plan, amount: plan.price });
      payment = await this.findOnePayment(created.id);
    }

    const types = await this.paymentTypeRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    // Har bir to'lov turining url shabloni shu to'lov ma'lumotlari bilan to'ldiriladi.
    const paymentTypes = types.map((type) => ({ ...type, url: buildPaymentUrl(type.url, payment) }));

    return { payment: withResolvedUrl(payment), paymentTypes };
  }

  /** Foydalanuvchi tanlagan to'lov turini kutilayotgan to'lovga biriktiradi. */
  async selectPaymentType(userId: string, paymentId: string, dto: SelectPaymentTypeDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, user: { id: userId } },
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

  /**
   * To'lovni tasdiqlaydi: yozilish faollashadi va to'lov tarixi yoziladi.
   * Sanalar berilmasa, hozirdan boshlab tarifdagi oylar soni bo'yicha hisoblanadi.
   */
  async markPaid(payment: Payment, start?: Date, end?: Date): Promise<Payment> {
    const from = start ?? new Date();
    const months = payment.plan?.month ?? 1;
    const to = end ?? addMonths(from, months);

    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak");
    }

    if (payment.enrollment) {
      payment.enrollment.status = EnrollmentStatus.ACTIVE;
      payment.enrollment.start = from;
      payment.enrollment.end = to;
      await this.enrollmentRepo.save(payment.enrollment);
      await this.historyRepo.save({
        enrollment: payment.enrollment,
        purchaseAmount: payment.amount,
        start: from,
        end: to,
      });
    }

    payment.status = PaymentStatus.PAID;
    return this.paymentRepo.save(payment);
  }

  /** To'lovni va unga bog'langan yozilishni bekor qiladi. */
  async markCancelled(payment: Payment): Promise<Payment> {
    if (payment.enrollment) {
      payment.enrollment.status = EnrollmentStatus.CANCELLED;
      await this.enrollmentRepo.save(payment.enrollment);
    }
    payment.status = PaymentStatus.CANCELLED;
    return this.paymentRepo.save(payment);
  }

  /** Admin to'lovni qo'lda tasdiqlaydi yoki bekor qiladi. */
  async updatePaymentStatus(paymentId: string, dto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.findOnePayment(paymentId);
    if (payment.status !== PaymentStatus.CREATED) {
      throw new BadRequestException("To'lov holati allaqachon yakunlangan");
    }
    if (dto.status === PaymentStatus.CREATED) {
      throw new BadRequestException("To'lov holati faqat 'paid' yoki 'cancelled' bo'lishi mumkin");
    }

    if (dto.status === PaymentStatus.CANCELLED) {
      return this.markCancelled(payment);
    }

    return this.markPaid(payment, dto.start ? new Date(dto.start) : undefined, dto.end ? new Date(dto.end) : undefined);
  }

  async findAllPayments(query: PaymentQuery): Promise<Paginated<Payment>> {
    const where: FindOptionsWhere<Payment> = {};
    if (query.userId) where.user = { id: query.userId };
    if (query.paymentTypeId) where.paymentType = { id: query.paymentTypeId };
    if (query.enrollmentId) where.enrollment = { id: query.enrollmentId };
    if (query.planId) where.plan = { id: query.planId };
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

  async findMyPayments(userId: string, query: PaginationQuery): Promise<Paginated<Payment>> {
    const [data, total] = await this.paymentRepo.findAndCount({
      where: { user: { id: userId } },
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

  async findMyPayment(userId: string, id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, user: { id: userId } },
      relations: paymentRelations,
    });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return withResolvedUrl(payment);
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.findOnePayment(id);
    await this.paymentRepo.remove(payment);
  }
}
