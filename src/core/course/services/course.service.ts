import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';

export const COURSE_RELATIONS = { units: { lessons: true } } as const;
export const COURSE_ORDER = { units: { createdAt: 'ASC', lessons: { createdAt: 'ASC' } } } as const;

@Injectable()
export class CourseService {
  constructor(@InjectRepository(Course) private readonly courseRepo: Repository<Course>) {}

  private withLessonsCount(course: Course) {
    const units = course.units.map((u) => ({ ...u, lessonsCount: u.lessons.length }));
    return { ...course, units, lessonsCount: units.reduce((sum, u) => sum + u.lessonsCount, 0) };
  }

  createCourse(dto: CreateCourseDto, image?: string) {
    return this.courseRepo.save({ ...dto, image });
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
      .orderBy('course.createdAt', 'DESC')
      .getRawAndEntities<{ unitsCount: string; lessonsCount: string }>();

    return entities.map((course, i) => ({
      ...course,
      unitsCount: Number(raw[i].unitsCount),
      lessonsCount: Number(raw[i].lessonsCount),
    }));
  }

  async findActiveCourses() {
    const courses = await this.courseRepo.find({
      where: { isActive: true },
      relations: COURSE_RELATIONS,
      order: COURSE_ORDER,
    });
    return courses.map((c) => this.withLessonsCount(c));
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
      order: { units: { createdAt: 'ASC' } },
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

  async findOneActiveCourse(id: string) {
    const course = await this.courseRepo.findOne({
      where: { id, isActive: true },
      relations: COURSE_RELATIONS,
      order: COURSE_ORDER,
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return this.withLessonsCount(course);
  }

  /**
   * Kurs ustunlarini yangilaydi. Bo'lim va darslar yuklanmaydi — ular
   * o'zgarmaydi, lekin ilgari saqlashdan oldin butun daraxt o'qilardi.
   */
  async updateCourse(id: string, dto: UpdateCourseDto, image?: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    await this.courseRepo.save({ ...course, ...dto, ...(image && { image }) });
    return this.findOneCourse(id);
  }

  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    await this.courseRepo.remove(course);
  }
}
