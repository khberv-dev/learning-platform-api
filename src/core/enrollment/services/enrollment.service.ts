import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { addMonths, isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { CourseService } from '@/core/course/services/course.service';
import { Student } from '@/core/user/entity/student.entity';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentHistory) private readonly historyRepo: Repository<EnrollmentHistory>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    private readonly courseService: CourseService,
  ) {}

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
    const activeCourses = await this.courseService.findActiveCourses();
    return activeCourses.filter((c) => !blockedCourseIds.has(c.id));
  }

  async getMyCourses(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    const now = new Date();
    const enrollments = await this.enrollmentRepo.find({
      where: { student: { id: student.id }, status: EnrollmentStatus.ACTIVE },
      relations: { course: { units: { lessons: true } }, progresses: true },
      order: { createdAt: 'DESC' },
    });

    return enrollments.map((e) => {
      const lessonsCount = e.course.units.reduce((sum, u) => sum + u.lessons.length, 0);
      const totalProgress =
        lessonsCount === 0 ? 0 : Math.round(e.progresses.reduce((sum, p) => sum + p.progress, 0) / lessonsCount);
      return {
        ...e,
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
   */
  async createEnrollment(dto: CreateEnrollmentDto) {
    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    let plan: Plan | null = null;
    let course: Course;

    if (dto.planId) {
      plan = await this.planRepo.findOne({ where: { id: dto.planId }, relations: { course: true } });
      if (!plan) throw new NotFoundException('Tarif topilmadi');
      course = plan.course;
    } else if (dto.courseId) {
      const found = await this.courseRepo.findOne({ where: { id: dto.courseId } });
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

    const existing = await this.enrollmentRepo.findOne({
      where: {
        student: { id: student.id },
        course: { id: course.id },
        status: In([EnrollmentStatus.CREATED, EnrollmentStatus.ACTIVE]),
      },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE && !isEnrollmentExpired(existing)) {
      throw new BadRequestException('Talaba allaqachon ushbu kursga yozilgan');
    }

    const enrollment = existing ?? this.enrollmentRepo.create({ student, course });
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.start = start;
    enrollment.end = end;
    await this.enrollmentRepo.save(enrollment);

    await this.historyRepo.save({
      enrollment,
      purchaseAmount: dto.purchaseAmount ?? plan?.price ?? 0,
      start,
      end,
    });

    return enrollment;
  }
}
