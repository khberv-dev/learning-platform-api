import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { PendingEnrollment } from '@/core/enrollment/entity/pending-enrollment.entity';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { CreatePendingEnrollmentDto } from '@/core/enrollment/dto/create-pending-enrollment.dto';
import { AcceptPendingEnrollmentDto } from '@/core/enrollment/dto/accept-pending-enrollment.dto';
import { PendingEnrollmentQuery } from '@/core/enrollment/dto/pending-enrollment-query.dto';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Payment } from '@/core/payment/entity/payment.entity';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { Purchase } from '@/core/payment/entity/purchase.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { Paginated, paginate } from '@/common/dto/pagination-query.dto';
import { PushService } from '@/core/notification/services/push.service';

const pendingRelations = {
  student: true,
  course: true,
  enrollment: true,
} as const;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

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

  async createPending(dto: CreatePendingEnrollmentDto): Promise<PendingEnrollment> {
    const student = await this.studentRepo.findOne({ where: { id: dto.userId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    if (!course.isActive) throw new BadRequestException('Kurs faol emas');

    const start = dto.start ? new Date(dto.start) : null;

    const active = await this.enrollmentRepo.findOne({
      where: { student: { id: student.id }, course: { id: course.id }, status: EnrollmentStatus.ACTIVE },
    });
    if (active) {
      throw new BadRequestException('Talaba allaqachon ushbu kursga yozilgan');
    }

    const existing = await this.pendingRepo.findOne({
      where: {
        student: { id: student.id },
        course: { id: course.id },
        status: PendingEnrollmentStatus.CREATED,
      },
      relations: pendingRelations,
    });

    if (existing) {
      existing.start = start;
      return this.pendingRepo.save(existing);
    }

    const created = await this.pendingRepo.save({ student, course, start });
    return this.findOnePending(created.id);
  }

  async findAllPending(query: PendingEnrollmentQuery): Promise<Paginated<PendingEnrollment>> {
    const where: FindOptionsWhere<PendingEnrollment> = {};
    if (query.userId) where.student = { id: query.userId };
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

  async acceptPending(id: string, dto: AcceptPendingEnrollmentDto) {
    const pending = await this.findOnePending(id);
    this.assertPendingIsOpen(pending);

    const plan = await this.planRepo.findOne({ where: { id: dto.planId }, relations: { course: true } });
    if (!plan) throw new NotFoundException('Tarif topilmadi');
    if (plan.course.id !== pending.course.id) {
      throw new BadRequestException("Tarif so'rovdagi kursga tegishli emas");
    }

    const amount = dto.amount ?? plan.price;

    const accepted = await this.dataSource.transaction(async (manager) => {
      const enrollment = await this.enrollmentService.createEnrollment(
        {
          studentId: pending.student.id,
          planId: plan.id,
          start: pending.start?.toISOString(),
          purchaseAmount: amount,
        },
        manager,
      );

      const payment = await manager.getRepository(Payment).save({
        student: pending.student,
        amount,
        status: PaymentStatus.PAID,
      });

      const subscriptionStart = enrollment.start ?? new Date();
      const subscription = await manager.getRepository(Subscription).save({
        student: pending.student,
        plan,
        start: subscriptionStart,
        end: addMonths(subscriptionStart, plan.month),
      });
      await manager.getRepository(Purchase).save({ payment, subscription });

      pending.status = PendingEnrollmentStatus.ACCEPTED;
      pending.enrollment = enrollment;
      await manager.getRepository(PendingEnrollment).save(pending);

      return { ...pending, enrollment, payment };
    });

    void this.pushService.notifyCourseEnrolled(pending.student.id, pending.course.id, pending.course.title);

    return accepted;
  }

  async rejectPending(id: string): Promise<PendingEnrollment> {
    const pending = await this.findOnePending(id);
    this.assertPendingIsOpen(pending);

    pending.status = PendingEnrollmentStatus.REJECTED;
    return this.pendingRepo.save(pending);
  }

  private assertPendingIsOpen(pending: PendingEnrollment): void {
    if (pending.status !== PendingEnrollmentStatus.CREATED) {
      throw new BadRequestException("Faqat kutilayotgan so'rovni tasdiqlash yoki rad etish mumkin");
    }
  }
}
