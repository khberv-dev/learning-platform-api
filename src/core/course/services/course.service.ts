import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { PushService } from '@/core/notification/services/push.service';
import { Progress } from '@/core/enrollment/entity/progress.entity';

export const COURSE_RELATIONS = { units: { lessons: true } } as const;

/**
 * Bo'lim va darslar admin belgilagan `index` bo'yicha saralanadi.
 * `createdAt` — ikkinchi mezon: `index` teng bo'lganda (masalan hammasi
 * standart 0 bo'lsa) tartib avvalgidek yaratilish vaqti bo'yicha qoladi.
 */
export const UNIT_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;
export const LESSON_ORDER = { index: 'ASC', createdAt: 'ASC' } as const;
export const COURSE_ORDER = { units: { ...UNIT_ORDER, lessons: LESSON_ORDER } } as const;

/**
 * Kurslar ham `index` bo'yicha saralanadi. Ikkinchi mezon — `createdAt` DESC:
 * tartib belgilanmagan (hammasi 0) kurslar avvalgidek yangisidan boshlab
 * ko'rsatiladi.
 */
export const COURSE_LIST_ORDER = { index: 'ASC', createdAt: 'DESC' } as const;

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    private readonly pushService: PushService,
  ) {}

  private withLessonsCount(course: Course, progressByLesson = new Map<string, number>()) {
    let previousLessonId: string | undefined;
    const units = course.units.map((unit) => {
      const lessons = unit.lessons.map((lesson) => {
        const isLocked = previousLessonId !== undefined && (progressByLesson.get(previousLessonId) ?? 0) < 80;
        previousLessonId = lesson.id;
        return { ...lesson, isLocked };
      });

      return { ...unit, lessons, lessonsCount: lessons.length };
    });
    return { ...course, units, lessonsCount: units.reduce((sum, u) => sum + u.lessonsCount, 0) };
  }

  private async progressByLesson(studentUserId: string, lessonIds: string[]): Promise<Map<string, number>> {
    if (lessonIds.length === 0) return new Map();

    const rows = await this.progressRepo
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .innerJoin('student.user', 'user')
      .innerJoin('progress.lesson', 'lesson')
      .select('lesson.id', 'lessonId')
      .addSelect('MAX(progress.progress)', 'progress')
      .where('user.id = :studentUserId', { studentUserId })
      .andWhere('lesson.id IN (:...lessonIds)', { lessonIds })
      .groupBy('lesson.id')
      .getRawMany<{ lessonId: string; progress: string }>();

    return new Map(rows.map((row) => [row.lessonId, Number(row.progress)]));
  }

  async createCourse(dto: CreateCourseDto, image?: string) {
    const course = await this.courseRepo.save({ ...dto, image });
    await this.announceIfPublished(course);
    return course;
  }

  /**
   * Talabalarga "yangi kurs" xabarnomasini yuboradi.
   *
   * Kurs yaratilganda odatda `isActive: false` bo'ladi (qoralama), shuning
   * uchun xabarnoma kurs talabalarga ko'rinadigan bo'lgan paytda — yaratilishda
   * yoki keyinroq faollashtirilganda — yuboriladi. `announcedAt` takroriy
   * e'londan saqlaydi.
   */
  private async announceIfPublished(course: Course): Promise<void> {
    if (!course.isActive || course.announcedAt) return;

    await this.courseRepo.update(course.id, { announcedAt: new Date() });
    void this.pushService.notifyCourseCreated(course.id, course.title);
  }

  /**
   * Admin ro'yxati — bo'lim va darslar yuklanmaydi, faqat sanoqlari qaytariladi.
   * Ilgari har bir kurs uchun butun daraxt (barcha bo'lim va darslar) yuklanardi:
   * ro'yxatga kerak bo'lmagan, lekin javobning katta qismini egallagan ma'lumot.
   *
   * Sanoqlar bitta so'rovda hisoblanadi — kurslar soniga qarab so'rov ko'paymaydi.
   */
  async findAllCourses() {
    const { entities, raw } = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.units', 'unit')
      .leftJoin('unit.lessons', 'lesson')
      .addSelect('COUNT(DISTINCT unit.id)', 'unitsCount')
      .addSelect('COUNT(DISTINCT lesson.id)', 'lessonsCount')
      .groupBy('course.id')
      .orderBy('course.index', 'ASC')
      .addOrderBy('course.createdAt', 'DESC')
      .getRawAndEntities<{ unitsCount: string; lessonsCount: string }>();

    return entities.map((course, i) => ({
      ...course,
      unitsCount: Number(raw[i].unitsCount),
      lessonsCount: Number(raw[i].lessonsCount),
    }));
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
    const progressByLesson = await this.progressByLesson(studentUserId, lessonIds);
    return courses.map((course) => this.withLessonsCount(course, progressByLesson));
  }

  /**
   * Admin uchun bitta kurs — bo'limlar ro'yxati bilan, lekin darslar ichida
   * emas: har bir bo'limda faqat `lessonsCount`. Darslar alohida endpoint
   * orqali olinadi (`GET /admin/courses/:courseId/units/:unitId/lessons`).
   */
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

  /**
   * Kurs id -> bo'lim va darslar soni. Bitta guruhlangan so'rov.
   *
   * Sanoq uchun butun daraxtni yuklash shart emas — kurslar ro'yxatida
   * (masalan talabaning kurslarida) faqat shu ikki son kerak bo'ladi.
   */
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

  /** Bo'lim id -> darslar soni. Bitta guruhlangan so'rov. */
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
    const progressByLesson = await this.progressByLesson(studentUserId, lessonIds);
    return this.withLessonsCount(course, progressByLesson);
  }

  /**
   * Kurs ustunlarini yangilaydi. Bo'lim va darslar yuklanmaydi — ular
   * o'zgarmaydi, lekin ilgari saqlashdan oldin butun daraxt o'qilardi.
   */
  async updateCourse(id: string, dto: UpdateCourseDto, image?: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    const saved = await this.courseRepo.save({ ...course, ...dto, ...(image && { image }) });
    // Qoralama kurs endi faollashtirilgan bo'lsa, talabalarga e'lon qilinadi.
    await this.announceIfPublished(saved);
    return this.findOneCourse(id);
  }

  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    await this.courseRepo.remove(course);
  }
}
