import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { PendingEnrollment } from '@/core/enrollment/entity/pending-enrollment.entity';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { CreatePendingEnrollmentDto } from '@/core/enrollment/dto/create-pending-enrollment.dto';
import { AcceptPendingEnrollmentDto } from '@/core/enrollment/dto/accept-pending-enrollment.dto';
import { PendingEnrollmentQuery } from '@/core/enrollment/dto/pending-enrollment-query.dto';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { Paginated, paginate } from '@/common/dto/pagination-query.dto';
import { PushService } from '@/core/notification/services/push.service';

const pendingRelations = {
  user: true,
  course: true,
  enrollment: true,
} as const;

@Injectable()
export class PendingEnrollmentService {
  constructor(
    @InjectRepository(PendingEnrollment) private readonly pendingRepo: Repository<PendingEnrollment>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    private readonly enrollmentService: EnrollmentService,
    private readonly pushService: PushService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tashqi xizmat yozilish so'rovini yuboradi — yozilish hali ochilmaydi,
   * admin tasdig'ini kutadi.
   *
   * Takroriy so'rov yangi yozuv yaratmaydi: shu foydalanuvchi va kurs uchun
   * kutilayotgan so'rov bo'lsa, sanalari yangilanib o'zi qaytariladi.
   */
  async createPending(dto: CreatePendingEnrollmentDto): Promise<PendingEnrollment> {
    const student = await this.studentRepo.findOne({ where: { user: { id: dto.userId } }, relations: { user: true } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    if (!course.isActive) throw new BadRequestException('Kurs faol emas');

    const start = dto.start ? new Date(dto.start) : null;
    const end = dto.end ? new Date(dto.end) : null;
    if (start && end && end.getTime() <= start.getTime()) {
      throw new BadRequestException("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak");
    }

    // Amaldagi yozilish bor bo'lsa so'rov ma'nosiz — admin vaqtini olmasin.
    const active = await this.enrollmentRepo.findOne({
      where: { student: { id: student.id }, course: { id: course.id }, status: EnrollmentStatus.ACTIVE },
    });
    if (active && !isEnrollmentExpired(active)) {
      throw new BadRequestException('Talaba allaqachon ushbu kursga yozilgan');
    }

    const existing = await this.pendingRepo.findOne({
      where: {
        user: { id: dto.userId },
        course: { id: course.id },
        status: PendingEnrollmentStatus.CREATED,
      },
      relations: pendingRelations,
    });

    if (existing) {
      existing.start = start;
      existing.end = end;
      return this.pendingRepo.save(existing);
    }

    const created = await this.pendingRepo.save({ user: student.user, course, start, end });
    return this.findOnePending(created.id);
  }

  async findAllPending(query: PendingEnrollmentQuery): Promise<Paginated<PendingEnrollment>> {
    const where: FindOptionsWhere<PendingEnrollment> = {};
    if (query.userId) where.user = { id: query.userId };
    if (query.courseId) where.course = { id: query.courseId };
    if (query.status) where.status = query.status;

    const [data, total] = await this.pendingRepo.findAndCount({
      where,
      relations: pendingRelations,
      order: { [query.sortBy]: query.sortOrder },
      skip: query.skip,
      take: query.take,
    });

    return paginate(data, total, query);
  }

  async findOnePending(id: string): Promise<PendingEnrollment> {
    const pending = await this.pendingRepo.findOne({ where: { id }, relations: pendingRelations });
    if (!pending) throw new NotFoundException("So'rov topilmadi");
    return pending;
  }

  /**
   * Admin so'rovni tasdiqlaydi: yozilish `active` bo'ladi, tanlangan tarif bilan
   * to'langan (`paid`) to'lov yozuvi ochiladi va tarixga yozuv qo'shiladi.
   *
   * Pul allaqachon tashqarida (naqd, o'tkazma) yig'ilgan deb hisoblanadi —
   * to'lov tizimi (Click, Payme) bu yo'lda qatnashmaydi.
   */
  async acceptPending(id: string, dto: AcceptPendingEnrollmentDto) {
    const pending = await this.findOnePending(id);
    this.assertPendingIsOpen(pending);

    const plan = await this.planRepo.findOne({ where: { id: dto.planId }, relations: { course: true } });
    if (!plan) throw new NotFoundException('Tarif topilmadi');
    if (plan.course.id !== pending.course.id) {
      throw new BadRequestException("Tarif so'rovdagi kursga tegishli emas");
    }

    const student = await this.studentRepo.findOne({ where: { user: { id: pending.user.id } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const amount = dto.amount ?? plan.price;

    const accepted = await this.dataSource.transaction(async (manager) => {
      const enrollment = await this.enrollmentService.createEnrollment(
        {
          studentId: student.id,
          planId: plan.id,
          start: pending.start?.toISOString(),
          end: pending.end?.toISOString(),
          purchaseAmount: amount,
        },
        manager,
      );

      const payment = await manager.getRepository(Payment).save({
        user: pending.user,
        enrollment,
        plan,
        amount,
        status: PaymentStatus.PAID,
      });

      pending.status = PendingEnrollmentStatus.ACCEPTED;
      pending.enrollment = enrollment;
      await manager.getRepository(PendingEnrollment).save(pending);

      return { ...pending, enrollment, payment };
    });

    // Xabarnoma commit'dan keyin: tranzaksiya orqaga qaytsa, talabaga
    // yozilmagan kurs haqida push ketmasin.
    void this.pushService.notifyCourseEnrolled(pending.user.id, pending.course.id, pending.course.title);

    return accepted;
  }

  /** Admin so'rovni rad etadi — yozilish ham, to'lov ham yaratilmaydi. */
  async rejectPending(id: string): Promise<PendingEnrollment> {
    const pending = await this.findOnePending(id);
    this.assertPendingIsOpen(pending);

    pending.status = PendingEnrollmentStatus.REJECTED;
    return this.pendingRepo.save(pending);
  }

  /** Yakunlangan so'rov qayta tasdiqlanmaydi va rad etilmaydi. */
  private assertPendingIsOpen(pending: PendingEnrollment): void {
    if (pending.status !== PendingEnrollmentStatus.CREATED) {
      throw new BadRequestException("Faqat kutilayotgan so'rovni tasdiqlash yoki rad etish mumkin");
    }
  }
}
