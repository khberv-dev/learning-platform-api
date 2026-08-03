import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { blocksNewPurchase, isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { CourseService } from '@/core/course/services/course.service';
import { Student } from '@/core/user/entity/student.entity';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(EnrollmentHistory) private readonly historyRepo: Repository<EnrollmentHistory>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly courseService: CourseService,
  ) {}

  async getAvailableCourses(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    const taken = await this.enrollmentRepo.find({
      where: { student: { id: student.id }, status: In([EnrollmentStatus.CREATED, EnrollmentStatus.ACTIVE]) },
      relations: { course: true },
    });

    // Muddati tugagan yozilishlar to'smaydi — kursni qayta sotib olish mumkin.
    const now = new Date();
    const blockedCourseIds = new Set(taken.filter((e) => blocksNewPurchase(e, now)).map((e) => e.course.id));
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

  async createEnrollment(dto: CreateEnrollmentDto) {
    const course = await this.courseService.findOneCourse(dto.courseId);
    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const enrollment = await this.enrollmentRepo.save({
      student,
      course,
      status: EnrollmentStatus.ACTIVE,
      start: new Date(dto.start),
      end: new Date(dto.end),
    });

    await this.historyRepo.save({
      enrollment,
      purchaseAmount: dto.purchaseAmount,
      start: enrollment.start,
      end: enrollment.end,
    });

    return enrollment;
  }
}
