import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { Course } from '@/core/course/entity/course.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { CourseService } from '@/core/course/services/course.service';
import { Student } from '@/core/user/entity/student.entity';
import { EnrollmentQuery } from '@/core/enrollment/dto/enrollment-query.dto';
import { Paginated, paginate, paginateInMemory, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { PushService } from '@/core/notification/services/push.service';

export interface CreateEnrollmentInput {
  studentId: string;
  courseId?: string;
  planId?: string;
  start?: string;
  purchaseAmount?: number;
}

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

  async findAllEnrollments(query: EnrollmentQuery): Promise<Paginated<Enrollment>> {
    const where: FindOptionsWhere<Enrollment> = {};
    if (query.studentId) where.student = { id: query.studentId };
    if (query.courseId) where.course = { id: query.courseId };
    if (query.status) where.status = query.status;

    const [data, total] = await this.enrollmentRepo.findAndCount({
      where,
      relations: { student: true, course: true },
      order: { [query.sortBy]: query.sortOrder },
      skip: query.skip,
      take: query.take,
    });

    return paginate(data, total, query);
  }

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

  async getAvailableCourses(studentId: string, query: PaginationQuery) {
    const taken = await this.enrollmentRepo.find({
      where: { student: { id: studentId }, status: EnrollmentStatus.ACTIVE },
      relations: { course: true },
    });

    const blockedCourseIds = new Set(taken.map((e) => e.course.id));
    const activeCourses = await this.courseService.findActiveCourses(studentId);
    const available = activeCourses.filter((c) => !blockedCourseIds.has(c.id));
    return paginateInMemory(available, query);
  }

  async getMyCourses(studentId: string, query: PaginationQuery) {
    const enrollments = await this.enrollmentRepo.find({
      where: { student: { id: studentId }, status: EnrollmentStatus.ACTIVE },
      relations: { course: true, progresses: true },
      order: { createdAt: 'DESC' },
    });

    const counts = await this.courseService.contentCountsByCourse(enrollments.map((e) => e.course.id));

    const data = enrollments.map((e) => {
      const { unitsCount = 0, lessonsCount = 0 } = counts.get(e.course.id) ?? {};
      const totalProgress =
        lessonsCount === 0 ? 0 : Math.round(e.progresses.reduce((sum, p) => sum + p.progress, 0) / lessonsCount);
      return {
        ...e,
        unitsCount,
        lessonsCount,
        totalProgress,
      };
    });
    return paginateInMemory(data, query);
  }

  async getHistory(studentId: string, query: PaginationQuery): Promise<Paginated<EnrollmentHistory>> {
    const [data, total] = await this.historyRepo.findAndCount({
      where: { enrollment: { student: { id: studentId } } },
      relations: { enrollment: { course: true } },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async createEnrollment(dto: CreateEnrollmentInput, manager?: EntityManager) {
    const studentRepo = manager?.getRepository(Student) ?? this.studentRepo;
    const courseRepo = manager?.getRepository(Course) ?? this.courseRepo;
    const planRepo = manager?.getRepository(Plan) ?? this.planRepo;
    const enrollmentRepo = manager?.getRepository(Enrollment) ?? this.enrollmentRepo;
    const historyRepo = manager?.getRepository(EnrollmentHistory) ?? this.historyRepo;

    const student = await studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    let plan: Plan | null = null;
    let course: Course;

    if (dto.planId) {
      plan = await planRepo.findOne({ where: { id: dto.planId }, relations: { course: true } });
      if (!plan) throw new NotFoundException('Tarif topilmadi');
      course = plan.course;
      if (dto.courseId && dto.courseId !== course.id) {
        throw new BadRequestException("Tarif ko'rsatilgan kursga tegishli emas");
      }
    } else if (dto.courseId) {
      const found = await courseRepo.findOne({ where: { id: dto.courseId } });
      if (!found) throw new NotFoundException('Kurs topilmadi');
      course = found;
    } else {
      throw new BadRequestException("planId yoki courseId ko'rsatilishi shart");
    }

    const start = dto.start ? new Date(dto.start) : new Date();

    const existing = await enrollmentRepo.findOne({
      where: { student: { id: student.id }, course: { id: course.id } },
    });

    if (existing?.status === EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Talaba allaqachon ushbu kursga yozilgan');
    }

    const enrollment = existing ?? enrollmentRepo.create({ student, course });
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.start = start;
    await enrollmentRepo.save(enrollment);

    await historyRepo.save({
      enrollment,
      purchaseAmount: dto.purchaseAmount ?? plan?.price ?? 0,
      start,
    });

    if (!manager) {
      void this.pushService.notifyCourseEnrolled(student.id, course.id, course.title);
    }

    return enrollment;
  }
}
