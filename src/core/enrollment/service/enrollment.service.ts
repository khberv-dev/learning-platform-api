import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { CreateEnrollmentDto } from '@/core/enrollment/dto/create-enrollment.dto';
import { CourseService } from '@/core/course/service/course.service';
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

    const now = new Date();
    const activeEnrollments = await this.enrollmentRepo.find({
      where: {
        student: { id: student.id },
        start: LessThanOrEqual(now),
        end: MoreThanOrEqual(now),
      },
      relations: { course: true },
    });

    const enrolledCourseIds = new Set(activeEnrollments.map((e) => e.course.id));
    const activeCourses = await this.courseService.findActiveCourses();
    return activeCourses.filter((c) => !enrolledCourseIds.has(c.id));
  }

  async getMyCourses(userId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: userId } } });
    if (!student) return [];

    const now = new Date();
    const enrollments = await this.enrollmentRepo.find({
      where: { student: { id: student.id } },
      relations: { course: { units: { lessons: true } } },
      order: { start: 'DESC' },
    });

    return enrollments.map((e) => ({
      ...e,
      status: now >= e.start && now <= e.end ? EnrollmentStatus.ACTIVE : EnrollmentStatus.EXPIRED,
    }));
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
