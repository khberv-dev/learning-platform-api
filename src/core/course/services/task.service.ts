import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@/core/course/entity/task.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { assertActiveEnrollmentForLesson } from '@/core/enrollment/utils/enrollment.util';
import { CreateTaskDto } from '@/core/course/dto/create-task.dto';
import { UpdateTaskDto } from '@/core/course/dto/update-task.dto';
import { TaskContentType } from '@/core/course/enum/task-content-type.enum';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  private async loadLesson(courseId: string, unitId: string, lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId, unit: { id: unitId, course: { id: courseId } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return lesson;
  }

  async createTask(courseId: string, unitId: string, lessonId: string, dto: CreateTaskDto): Promise<Task> {
    const lesson = await this.loadLesson(courseId, unitId, lessonId);
    return this.taskRepo.save({
      name: dto.name ?? null,
      questions: dto.questions.map((q) => ({ ...q, options: q.options ?? null })),
      file: dto.file ?? null,
      contentType: dto.file ? TaskContentType.TEXT : null,
      lesson,
    });
  }

  async listTasks(courseId: string, unitId: string, lessonId: string): Promise<Task[]> {
    await this.loadLesson(courseId, unitId, lessonId);
    return this.taskRepo.find({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Talaba uchun topshiriqlar ro'yxati: faqat yozilgan kursi bo'yicha va
   * to'g'ri javoblarsiz. Admin uchun to'liq ma'lumot qaytariladi — u javob
   * varaqasini ko'rishi kerak.
   */
  async listTasksForStudent(courseId: string, unitId: string, lessonId: string, studentUserId: string) {
    await this.loadLesson(courseId, unitId, lessonId);
    await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentUserId, lessonId);

    const tasks = await this.taskRepo.find({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
    });

    return tasks.map((task) => ({
      ...task,
      questions: task.questions.map((q) => ({ question: q.question, options: q.options })),
    }));
  }

  async updateTask(
    courseId: string,
    unitId: string,
    lessonId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    if (dto.name !== undefined) task.name = dto.name ?? null;
    if (dto.questions !== undefined) task.questions = dto.questions.map((q) => ({ ...q, options: q.options ?? null }));
    if (dto.file !== undefined) {
      task.file = dto.file ?? null;
      task.contentType = dto.file ? TaskContentType.TEXT : null;
    }
    return this.taskRepo.save(task);
  }

  async uploadFile(
    courseId: string,
    unitId: string,
    lessonId: string,
    taskId: string,
    file: string,
    contentType: TaskContentType,
  ): Promise<Task> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    return this.taskRepo.save({ ...task, file, contentType });
  }

  async deleteTask(courseId: string, unitId: string, lessonId: string, taskId: string): Promise<void> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    await this.taskRepo.remove(task);
  }
}
