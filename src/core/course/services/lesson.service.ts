import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { Task } from '@/core/course/entity/task.entity';
import { TaskSubmission } from '@/core/course/entity/task-submission.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';
import { LESSON_ORDER } from '@/core/course/services/course.service';
import { PushService } from '@/core/notification/services/push.service';
import { MaterialService } from '@/core/material/services/material.service';
import { removeLessonMediaFile } from '@/core/course/storage/lesson-media.storage';
import { paginate, paginateInMemory, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

const LESSON_UNLOCK_PERCENT = 80;

export interface StudentLessonListItem {
  id: string;
  title: string;
  description: string | null;
  isLocked: boolean;
}

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    private readonly pushService: PushService,
    private readonly materialService: MaterialService,
  ) {}

  async listLessons(courseId: string, unitId: string, query: PaginationQuery): Promise<Paginated<Lesson>> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId, course: { id: courseId } } });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");

    const [data, total] = await this.lessonRepo.findAndCount({
      where: { unit: { id: unitId } },
      order: LESSON_ORDER,
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
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

    const rows = await this.taskRepo
      .createQueryBuilder('task')
      .innerJoin('task.lesson', 'lesson')
      .select('lesson.id', 'lessonId')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('lesson.id IN (:...lessonIds)', { lessonIds })
      .groupBy('lesson.id')
      .getRawMany<{ lessonId: string; taskCount: string }>();

    return new Map(rows.map((row) => [row.lessonId, Number(row.taskCount)]));
  }

  async findLessonsForStudent(
    courseId: string,
    unitId: string,
    studentUserId: string,
    query: PaginationQuery,
  ): Promise<Paginated<StudentLessonListItem>> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId, course: { id: courseId } } });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");

    const lessons = await this.lessonRepo.find({ where: { unit: { id: unitId } }, order: LESSON_ORDER });
    const lessonIds = lessons.map((lesson) => lesson.id);
    const [progressByLesson, taskCountByLesson] = await Promise.all([
      this.progressByLesson(studentUserId, lessonIds),
      this.taskCountByLesson(lessonIds),
    ]);

    let previousLessonId: string | undefined;
    const data = lessons.map((lesson) => {
      const previousLessonHasTasks =
        previousLessonId !== undefined && (taskCountByLesson.get(previousLessonId) ?? 0) > 0;
      const isLocked = previousLessonHasTasks && (progressByLesson.get(previousLessonId!) ?? 0) < LESSON_UNLOCK_PERCENT;
      previousLessonId = lesson.id;
      return { id: lesson.id, title: lesson.title, description: lesson.description, isLocked };
    });

    return paginateInMemory(data, query);
  }

  async findOneLessonForStudent(courseId: string, unitId: string, lessonId: string, studentUserId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    const [totalTasks, completedTasks, progressRow, materials] = await Promise.all([
      this.taskRepo
        .createQueryBuilder('task')
        .where('task.lesson_id = :lessonId', { lessonId })
        .andWhere('jsonb_array_length(task.questions) > 0')
        .getCount(),
      this.submissionRepo.count({
        where: { student: { id: studentUserId }, task: { lesson: { id: lessonId } }, isCorrect: true },
      }),
      this.progressRepo
        .createQueryBuilder('progress')
        .innerJoin('progress.enrollment', 'enrollment')
        .innerJoin('enrollment.student', 'student')
        .select('MAX(progress.progress)', 'progress')
        .where('student.id = :studentUserId', { studentUserId })
        .andWhere('progress.lesson_id = :lessonId', { lessonId })
        .getRawOne<{ progress: string | null }>(),
      this.materialService.listAllForLesson(lessonId),
    ]);

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      media: lesson.media,
      taskProgression: {
        totalTasks,
        completedTasks,
        progressPercent: Number(progressRow?.progress ?? 0),
      },
      materials: materials.map((material) => ({
        id: material.id,
        name: material.name,
        url: material.url,
        type: material.type,
      })),
    };
  }

  async createLesson(courseId: string, unitId: string, dto: CreateLessonDto, media?: string) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, course: { id: courseId } },
      relations: { course: true },
    });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");
    const lesson = await this.lessonRepo.save({ ...dto, media, unit });

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
    const previousMedia = lesson.media;
    const updated = await this.lessonRepo.save({ ...lesson, media });
    if (previousMedia !== media) await this.cleanupMedia(previousMedia);
    return updated;
  }

  async deleteMedia(courseId: string, unitId: string, lessonId: string): Promise<void> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    const media = lesson.media;
    if (media !== null) {
      lesson.media = null;
      await this.lessonRepo.save(lesson);
      await this.cleanupMedia(media);
    }
  }

  async deleteLesson(courseId: string, unitId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    const media = lesson.media;
    await this.lessonRepo.remove(lesson);
    await this.cleanupMedia(media);
  }

  private async cleanupMedia(media: string | null | undefined): Promise<void> {
    try {
      await removeLessonMediaFile(media);
    } catch (error) {
      this.logger.error(`Dars videosini diskdan o'chirib bo'lmadi: ${media}`, error as Error);
    }
  }
}
