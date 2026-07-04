import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@/core/course/entity/task.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { CreateTaskDto } from '@/core/course/dto/create-task.dto';
import { UpdateTaskDto } from '@/core/course/dto/update-task.dto';
import { TaskFileType } from '@/core/course/enum/task-file-type.enum';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
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
      questions: dto.questions.map((q) => ({ ...q, options: q.options ?? null })),
      file: dto.file ?? null,
      fileType: dto.fileType ?? null,
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

  async updateTask(courseId: string, unitId: string, lessonId: string, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    if (dto.questions !== undefined) task.questions = dto.questions.map((q) => ({ ...q, options: q.options ?? null }));
    if (dto.file !== undefined) task.file = dto.file ?? null;
    if (dto.fileType !== undefined) task.fileType = dto.fileType ?? null;
    return this.taskRepo.save(task);
  }

  async uploadFile(courseId: string, unitId: string, lessonId: string, taskId: string, file: string, fileType: TaskFileType): Promise<Task> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    return this.taskRepo.save({ ...task, file, fileType });
  }

  async deleteTask(courseId: string, unitId: string, lessonId: string, taskId: string): Promise<void> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    await this.taskRepo.remove(task);
  }
}
