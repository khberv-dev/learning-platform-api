import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
  ) {}

  async createLesson(courseId: string, unitId: string, dto: CreateLessonDto, media?: string) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, course: { id: courseId } },
    });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");
    return this.lessonRepo.save({ ...dto, media, unit });
  }

  async updateLesson(courseId: string, unitId: string, lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return this.lessonRepo.save({ ...lesson, ...dto });
  }

  async deleteLesson(courseId: string, unitId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await this.lessonRepo.remove(lesson);
  }
}
