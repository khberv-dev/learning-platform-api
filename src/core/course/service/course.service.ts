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

  createCourse(dto: CreateCourseDto, image?: string) {
    return this.courseRepo.save({ ...dto, image });
  }

  findAllCourses() {
    return this.courseRepo.find({ relations: COURSE_RELATIONS });
  }

  findActiveCourses() {
    return this.courseRepo.find({ where: { isActive: true }, relations: COURSE_RELATIONS });
  }

  async findOneCourse(id: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: COURSE_RELATIONS });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return course;
  }

  async findOneActiveCourse(id: string) {
    const course = await this.courseRepo.findOne({
      where: { id, isActive: true },
      relations: COURSE_RELATIONS,
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto, image?: string) {
    const course = await this.findOneCourse(id);
    return this.courseRepo.save({ ...course, ...dto, ...(image && { image }) });
  }

  async deleteCourse(id: string) {
    const course = await this.findOneCourse(id);
    await this.courseRepo.remove(course);
  }
}
