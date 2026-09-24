import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { PushService } from '@/core/notification/services/push.service';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { paginate, paginateInMemory, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

export const UNIT_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;
export const LESSON_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;

export const COURSE_LIST_ORDER = { index: 'ASC', createdAt: 'DESC' } as const;

export interface StudentCourseListItem {
  id: string;
  title: string;
  image: string | null;
  totalProgress: number;
}

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly pushService: PushService,
  ) {}

  private async totalProgressByCourse(studentUserId: string, courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map();

    const enrollments = await this.enrollmentRepo.find({
      where: { student: { id: studentUserId }, course: { id: In(courseIds) }, status: EnrollmentStatus.ACTIVE },
      relations: { course: true, progresses: true },
    });

    const activeEnrollments = enrollments.filter((enrollment) => !isEnrollmentExpired(enrollment));
    const contentCounts = await this.contentCountsByCourse(activeEnrollments.map((e) => e.course.id));

    const result = new Map<string, number>();
    for (const enrollment of activeEnrollments) {
      const lessonsCount = contentCounts.get(enrollment.course.id)?.lessonsCount ?? 0;
      const progress =
        lessonsCount === 0
          ? 0
          : Math.round(enrollment.progresses.reduce((sum, p) => sum + p.progress, 0) / lessonsCount);
      result.set(enrollment.course.id, progress);
    }
    return result;
  }

  async createCourse(dto: CreateCourseDto, image?: string) {
    const course = await this.courseRepo.save({ ...dto, image });
    await this.announceIfPublished(course);
    return course;
  }

  private async announceIfPublished(course: Course): Promise<void> {
    if (!course.isActive || course.announcedAt) return;

    await this.courseRepo.update(course.id, { announcedAt: new Date() });
    void this.pushService.notifyCourseCreated(course.id, course.title);
  }

  async findAllCourses(
    query: PaginationQuery,
  ): Promise<Paginated<Course & { unitsCount: number; lessonsCount: number }>> {
    const [total, { entities, raw }] = await Promise.all([
      this.courseRepo.count(),
      this.courseRepo
        .createQueryBuilder('course')
        .leftJoin('course.units', 'unit')
        .leftJoin('unit.lessons', 'lesson')
        .addSelect('COUNT(DISTINCT unit.id)', 'unitsCount')
        .addSelect('COUNT(DISTINCT lesson.id)', 'lessonsCount')
        .groupBy('course.id')
        .orderBy('course.index', 'ASC')
        .addOrderBy('course.createdAt', 'DESC')
        .skip(query.skip)
        .take(query.take)
        .getRawAndEntities<{ unitsCount: string; lessonsCount: string }>(),
    ]);

    const data = entities.map((course, i) => ({
      ...course,
      unitsCount: Number(raw[i].unitsCount),
      lessonsCount: Number(raw[i].lessonsCount),
    }));

    return paginate(data, total, query);
  }

  async findActiveCoursesPaginated(
    studentUserId: string,
    query: PaginationQuery,
  ): Promise<Paginated<StudentCourseListItem>> {
    const courses = await this.findActiveCourses(studentUserId);
    return paginateInMemory(courses, query);
  }

  async findActiveCourses(studentUserId: string): Promise<StudentCourseListItem[]> {
    const courses = await this.courseRepo.find({
      where: { isActive: true },
      order: COURSE_LIST_ORDER,
    });
    const totalProgressByCourseId = await this.totalProgressByCourse(
      studentUserId,
      courses.map((c) => c.id),
    );
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      image: course.image,
      totalProgress: totalProgressByCourseId.get(course.id) ?? 0,
    }));
  }

  async findOneCourse(id: string) {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: { units: true },
      order: { units: UNIT_ORDER },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    const counts = await this.lessonCountsByUnit(course.units.map((u) => u.id));
    const units = course.units.map((u) => ({ ...u, lessonsCount: counts.get(u.id) ?? 0 }));

    return {
      ...course,
      units,
      unitsCount: units.length,
      lessonsCount: units.reduce((sum, u) => sum + u.lessonsCount, 0),
    };
  }

  async contentCountsByCourse(courseIds: string[]): Promise<Map<string, { unitsCount: number; lessonsCount: number }>> {
    if (courseIds.length === 0) return new Map();

    const rows = await this.courseRepo.manager
      .createQueryBuilder(Unit, 'unit')
      .leftJoin('unit.lessons', 'lesson')
      .select('unit.course_id', 'courseId')
      .addSelect('COUNT(DISTINCT unit.id)', 'unitsCount')
      .addSelect('COUNT(lesson.id)', 'lessonsCount')
      .where('unit.course_id IN (:...courseIds)', { courseIds })
      .groupBy('unit.course_id')
      .getRawMany<{ courseId: string; unitsCount: string; lessonsCount: string }>();

    return new Map(
      rows.map((r) => [r.courseId, { unitsCount: Number(r.unitsCount), lessonsCount: Number(r.lessonsCount) }]),
    );
  }

  async lessonCountsByUnit(unitIds: string[]): Promise<Map<string, number>> {
    if (unitIds.length === 0) return new Map();

    const rows = await this.courseRepo.manager
      .createQueryBuilder(Lesson, 'lesson')
      .select('lesson.unit_id', 'unitId')
      .addSelect('COUNT(*)', 'count')
      .where('lesson.unit_id IN (:...unitIds)', { unitIds })
      .groupBy('lesson.unit_id')
      .getRawMany<{ unitId: string; count: string }>();

    return new Map(rows.map((r) => [r.unitId, Number(r.count)]));
  }

  async findOneActiveCourse(
    id: string,
    studentUserId: string,
  ): Promise<StudentCourseListItem & { description: string | null }> {
    const course = await this.courseRepo.findOne({ where: { id, isActive: true } });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    const totalProgressByCourseId = await this.totalProgressByCourse(studentUserId, [course.id]);
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.image,
      totalProgress: totalProgressByCourseId.get(course.id) ?? 0,
    };
  }

  async updateCourse(id: string, dto: UpdateCourseDto, image?: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    const saved = await this.courseRepo.save({ ...course, ...dto, ...(image && { image }) });
    await this.announceIfPublished(saved);
    return this.findOneCourse(id);
  }

  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    await this.courseRepo.remove(course);
  }
}
