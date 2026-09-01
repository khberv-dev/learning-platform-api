import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { addMonths, isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { CourseService } from '@/core/course/services/course.service';
import { Student } from '@/core/user/entity/student.entity';
import { EnrollmentQuery } from '@/core/enrollment/dto/enrollment-query.dto';
import { Paginated, paginate } from '@/common/dto/pagination-query.dto';
import { PushService } from '@/core/notification/services/push.service';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentHistory) private readonly historyRepo: Repository<EnrollmentHistory>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    private readonly courseService: CourseService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Admin uchun yozilishlar ro'yxati: filtr, saralash va sahifalash bilan.
   *
   * `isExpired` muddat bo'yicha filtr — u berilganda va alohida `status`
   * ko'rsatilmaganda status `active` deb olinadi, chunki muddat faqat faol
   * yozilishda ma'noga ega.
   */
  async findAllEnrollments(query: EnrollmentQuery): Promise<Paginated<Enrollment>> {
    const where: FindOptionsWhere<Enrollment> = {};
    if (query.studentId) where.student = { id: query.studentId };
    if (query.courseId) where.course = { id: query.courseId };
    if (query.status) where.status = query.status;

    const now = new Date();
    if (query.isExpired !== undefined) {
      where.status ??= EnrollmentStatus.ACTIVE;
      where.end = query.isExpired ? LessThan(now) : MoreThanOrEqual(now);
    }

    const [data, total] = await this.enrollmentRepo.findAndCount({
      where,
      relations: { student: { user: true }, course: true },
      order: { [query.sortBy]: query.sortOrder },
      skip: query.skip,
      take: query.take,
    });

    return paginate(data, total, query);
  }

  /**
   * Admin uchun bitta yozilishdagi to'liq o'zlashtirish daraxti.
   *
   * Progress yozuvi hali yaratilmagan darslar ham javobga kiradi va ularning
   * qiymati 0 bo'ladi. Kurs progressi barcha darslar bo'yicha hisoblanadi;
   * bo'lim progresslarining o'rtachasi olinmaydi, chunki bo'limlardagi darslar
   * soni har xil bo'lishi mumkin.
   */
  async getStudentCourseProgress(studentId: string, enrollmentId: string) {
    const studentExists = await this.studentRepo.exists({ where: { id: studentId } });
    if (!studentExists) throw new NotFoundException('Talaba topilmadi');

    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, student: { id: studentId } },
      relations: {
        course: { units: { lessons: true } },
        progresses: { lesson: true },
      },
    });
    if (!enrollment) throw new NotFoundException('Yozilish topilmadi');

    const progressByLesson = new Map(enrollment.progresses.map((item) => [item.lesson.id, item.progress]));
    const units = [...enrollment.course.units]
      .sort((a, b) => a.index - b.index || a.createdAt.getTime() - b.createdAt.getTime())
      .map((unit) => {
        const lessons = [...unit.lessons]
          .sort((a, b) => a.index - b.index || a.createdAt.getTime() - b.createdAt.getTime())
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            index: lesson.index,
            progress: progressByLesson.get(lesson.id) ?? 0,
          }));

        return {
          id: unit.id,
          title: unit.title,
          index: unit.index,
          progress: this.averageProgress(lessons.map((lesson) => lesson.progress)),
          lessons,
        };
      });

    return {
      studentId,
      enrollmentId: enrollment.id,
      status: enrollment.status,
      start: enrollment.start,
      end: enrollment.end,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        progress: this.averageProgress(units.flatMap((unit) => unit.lessons.map((lesson) => lesson.progress))),
        units,
      },
    };
  }

  private averageProgress(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  async getAvailableCourses(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    // Faqat muddati tugamagan faol yozilish kursni ro'yxatdan chiqaradi.
    // `created` (to'lov kutilmoqda) va muddati tugaganlari to'smaydi.
    const taken = await this.enrollmentRepo.find({
      where: { student: { id: student.id }, status: EnrollmentStatus.ACTIVE },
      relations: { course: true },
    });

    const now = new Date();
    const blockedCourseIds = new Set(taken.filter((e) => !isEnrollmentExpired(e, now)).map((e) => e.course.id));
    const activeCourses = await this.courseService.findActiveCourses(userId);
    return activeCourses.filter((c) => !blockedCourseIds.has(c.id));
  }

  /**
   * Talabaning faol kurslari. Kurs mazmuni (bo'lim va darslar) yuklanmaydi —
   * ilgari butun daraxt faqat `lessonsCount` ni hisoblash uchun o'qilardi va
   * javobning deyarli hammasini egallardi. Ilova darslar ro'yxatini alohida
   * `GET /api/courses/:id` orqali oladi.
   */
  async getMyCourses(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    const now = new Date();
    const enrollments = await this.enrollmentRepo.find({
      where: { student: { id: student.id }, status: EnrollmentStatus.ACTIVE },
      relations: { course: true, progresses: true },
      order: { createdAt: 'DESC' },
    });

    const counts = await this.courseService.contentCountsByCourse(enrollments.map((e) => e.course.id));

    return enrollments.map((e) => {
      const { unitsCount = 0, lessonsCount = 0 } = counts.get(e.course.id) ?? {};
      const totalProgress =
        lessonsCount === 0 ? 0 : Math.round(e.progresses.reduce((sum, p) => sum + p.progress, 0) / lessonsCount);
      return {
        ...e,
        unitsCount,
        lessonsCount,
        totalProgress,
        isExpired: isEnrollmentExpired(e, now),
      };
    });
  }

  async getHistory(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    return this.historyRepo.find({
      where: { enrollment: { student: { id: student.id } } },
      relations: { enrollment: { course: true } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin talabani kursga qo'lda yozadi — to'lovsiz. To'lov (payment) yozuvi
   * yaratilmaydi, faqat yozilish faollashadi va tarixga yozuv qo'shiladi.
   *
   * Talabada shu kurs uchun yozilish allaqachon bo'lsa (muddati tugagan yoki
   * to'lov kutayotgan), yangisi yaratilmaydi — mavjudi qayta faollashtiriladi,
   * shunda progress saqlanib qoladi.
   *
   * `manager` berilsa yozuvlar o'sha tranzaksiya ichida saqlanadi — kutilayotgan
   * so'rovni tasdiqlashda yozilish, to'lov va so'rov birga yoziladi.
   */
  async createEnrollment(dto: CreateEnrollmentDto, manager?: EntityManager) {
    const studentRepo = manager?.getRepository(Student) ?? this.studentRepo;
    const courseRepo = manager?.getRepository(Course) ?? this.courseRepo;
    const planRepo = manager?.getRepository(Plan) ?? this.planRepo;
    const enrollmentRepo = manager?.getRepository(Enrollment) ?? this.enrollmentRepo;
    const historyRepo = manager?.getRepository(EnrollmentHistory) ?? this.historyRepo;

    const student = await studentRepo.findOne({ where: { id: dto.studentId }, relations: { user: true } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    let plan: Plan | null = null;
    let course: Course;

    if (dto.planId) {
      plan = await planRepo.findOne({ where: { id: dto.planId }, relations: { course: true } });
      if (!plan) throw new NotFoundException('Tarif topilmadi');
      course = plan.course;
    } else if (dto.courseId) {
      const found = await courseRepo.findOne({ where: { id: dto.courseId } });
      if (!found) throw new NotFoundException('Kurs topilmadi');
      course = found;
    } else {
      throw new BadRequestException("planId yoki courseId ko'rsatilishi shart");
    }

    const start = dto.start ? new Date(dto.start) : new Date();
    let end: Date;
    if (dto.end) {
      end = new Date(dto.end);
    } else if (plan) {
      end = addMonths(start, plan.month);
    } else {
      throw new BadRequestException("Tugash sanasi (end) kerak yoki tarif (planId) ko'rsating");
    }

    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak");
    }

    const existing = await enrollmentRepo.findOne({
      where: {
        student: { id: student.id },
        course: { id: course.id },
        status: In([EnrollmentStatus.CREATED, EnrollmentStatus.ACTIVE]),
      },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE && !isEnrollmentExpired(existing)) {
      throw new BadRequestException('Talaba allaqachon ushbu kursga yozilgan');
    }

    const enrollment = existing ?? enrollmentRepo.create({ student, course });
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.start = start;
    enrollment.end = end;
    await enrollmentRepo.save(enrollment);

    await historyRepo.save({
      enrollment,
      purchaseAmount: dto.purchaseAmount ?? plan?.price ?? 0,
      start,
      end,
    });

    // Tranzaksiya ichida chaqirilganda xabarnoma bu yerdan yuborilmaydi:
    // yozuvlar hali saqlanmagan bo'lishi mumkin. U holda commit'dan keyin
    // chaqiruvchi (`PendingEnrollmentService`) yuboradi.
    if (!manager) {
      void this.pushService.notifyCourseEnrolled(student.user.id, course.id, course.title);
    }

    return enrollment;
  }
}
