import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Task } from '@/core/course/entity/task.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { PushService } from '@/core/notification/services/push.service';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { paginate, paginateInMemory, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

export const COURSE_RELATIONS = { units: { lessons: true } } as const;

export const UNIT_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;
export const LESSON_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;
export const COURSE_ORDER = { units: { ...UNIT_ORDER, lessons: LESSON_ORDER } } as const;

export const COURSE_LIST_ORDER = { index: 'ASC', createdAt: 'DESC' } as const;

const LESSON_UNLOCK_PERCENT = 80;

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    private readonly pushService: PushService,
  ) {}

  private withLessonsCount(
    course: Course,
    progressByLesson = new Map<string, number>(),
    taskCountByLesson = new Map<string, number>(),
  ) {
    const units = course.units.map((unit) => {
      let previousLessonId: string | undefined;
      const lessons = unit.lessons.map((lesson) => {
        const previousLessonHasTasks =
          previousLessonId !== undefined && (taskCountByLesson.get(previousLessonId) ?? 0) > 0;
        const isLocked =
          previousLessonHasTasks && (progressByLesson.get(previousLessonId!) ?? 0) < LESSON_UNLOCK_PERCENT;
        previousLessonId = lesson.id;
        return { ...lesson, isLocked };
      });

      return { ...unit, lessons, lessonsCount: lessons.length };
    });
    return { ...course, units, lessonsCount: units.reduce((sum, u) => sum + u.lessonsCount, 0) };
  }

  private async lockContext(
    studentUserId: string,
    lessonIds: string[],
  ): Promise<[Map<string, number>, Map<string, number>]> {
    return Promise.all([this.progressByLesson(studentUserId, lessonIds), this.taskCountByLesson(lessonIds)]);
  }

  private async progressByLesson(studentUserId: string, lessonIds: string[]): Promise<Map<string, number>> {
    if (lessonIds.length === 0) return new Map();

    const rows = await this.progressRepo
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .innerJoin('progress.lesson', 'lesson')
      .select('lesson.id', 'lessonId')
      .addSelect('MAX(progress.progress)', 'progress')
      .where('student.id = :studentUserId', { studentUserId })
      .andWhere('lesson.id IN (:...lessonIds)', { lessonIds })
      .groupBy('lesson.id')
      .getRawMany<{ lessonId: string; progress: string }>();

    return new Map(rows.map((row) => [row.lessonId, Number(row.progress)]));
  }

  private async taskCountByLesson(lessonIds: string[]): Promise<Map<string, number>> {
    if (lessonIds.length === 0) return new Map();

    const rows = await this.courseRepo.manager
      .createQueryBuilder(Task, 'task')
      .innerJoin('task.lesson', 'lesson')
      .select('lesson.id', 'lessonId')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('lesson.id IN (:...lessonIds)', { lessonIds })
      .groupBy('lesson.id')
      .getRawMany<{ lessonId: string; taskCount: string }>();

    return new Map(rows.map((row) => [row.lessonId, Number(row.taskCount)]));
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

  async findActiveCoursesPaginated(studentUserId: string, query: PaginationQuery) {
    const courses = await this.findActiveCourses(studentUserId);
    return paginateInMemory(courses, query);
  }

  async findActiveCourses(studentUserId: string) {
    const courses = await this.courseRepo.find({
      where: { isActive: true },
      relations: COURSE_RELATIONS,
      order: { ...COURSE_LIST_ORDER, ...COURSE_ORDER },
    });
    const lessonIds = courses.flatMap((course) =>
      course.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)),
    );
    const [progressByLesson, taskCountByLesson] = await this.lockContext(studentUserId, lessonIds);
    return courses.map((course) => this.withLessonsCount(course, progressByLesson, taskCountByLesson));
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

  private async lessonCountsByUnit(unitIds: string[]): Promise<Map<string, number>> {
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

  async findOneActiveCourse(id: string, studentUserId: string) {
    const course = await this.courseRepo.findOne({
      where: { id, isActive: true },
      relations: COURSE_RELATIONS,
      order: COURSE_ORDER,
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    const lessonIds = course.units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));
    const [progressByLesson, taskCountByLesson] = await this.lockContext(studentUserId, lessonIds);
    return this.withLessonsCount(course, progressByLesson, taskCountByLesson);
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
