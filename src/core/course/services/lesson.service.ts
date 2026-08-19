import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';
import { LESSON_ORDER } from '@/core/course/services/course.service';
import { PushService } from '@/core/notification/services/push.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    private readonly pushService: PushService,
  ) {}

  /**
   * Bo'lim darslari. Kurs javobidan darslar olib tashlangani uchun admin
   * panel darslarni shu yerdan oladi.
   */
  async listLessons(courseId: string, unitId: string) {
    const unit = await this.unitRepo.findOne({ where: { id: unitId, course: { id: courseId } } });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");

    return this.lessonRepo.find({
      where: { unit: { id: unitId } },
      order: LESSON_ORDER,
    });
  }

  async createLesson(courseId: string, unitId: string, dto: CreateLessonDto, media?: string) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, course: { id: courseId } },
      relations: { course: true },
    });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");
    const lesson = await this.lessonRepo.save({ ...dto, media, unit });

    // Faqat shu kursga yozilgan talabalarga — muddati tugaganlarga yuborilmaydi.
    void this.pushService.notifyLessonAdded(unit.course.id, unit.course.title, lesson.title);

    return lesson;
  }

  async updateLesson(courseId: string, unitId: string, lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return this.lessonRepo.save({ ...lesson, ...dto });
  }

  async uploadMedia(courseId: string, unitId: string, lessonId: string, media: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return this.lessonRepo.save({ ...lesson, media });
  }

  async deleteLesson(courseId: string, unitId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    await this.lessonRepo.remove(lesson);
  }
}
