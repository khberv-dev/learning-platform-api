import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';

export const COURSE_RELATIONS = { units: { lessons: true } } as const;

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

  async findAllCourses() {
    const courses = await this.courseRepo.find({ relations: COURSE_RELATIONS });
    return courses.map((c) => this.withLessonsCount(c));
  }

  async findActiveCourses() {
    const courses = await this.courseRepo.find({ where: { isActive: true }, relations: COURSE_RELATIONS });
    return courses.map((c) => this.withLessonsCount(c));
  }

  async findOneCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: COURSE_RELATIONS });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return this.withLessonsCount(course);
  }

  async findOneActiveCourse(id: string) {
    const course = await this.courseRepo.findOne({
      where: { id, isActive: true },
      relations: COURSE_RELATIONS,
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return this.withLessonsCount(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto, image?: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: COURSE_RELATIONS });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return this.courseRepo.save({ ...course, ...dto, ...(image && { image }) });
  }

  async deleteCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    await this.courseRepo.remove(course);
  }
}
