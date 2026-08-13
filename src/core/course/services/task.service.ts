import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@/core/course/entity/task.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { assertActiveEnrollmentForLesson } from '@/core/enrollment/utils/enrollment.util';
import { CreateTaskDto, TaskQuestionDto } from '@/core/course/dto/create-task.dto';
import { UpdateTaskDto } from '@/core/course/dto/update-task.dto';
import { UpdateTaskQuestionDto } from '@/core/course/dto/update-task-question.dto';
import { TaskContentType } from '@/core/course/enum/task-content-type.enum';
import { TaskQuestion } from '@/core/course/entity/task.entity';

/** `options` doim mavjud bo'lsin — berilmagani ochiq javobli savol degani. */
function toQuestion(dto: TaskQuestionDto): TaskQuestion {
  return { question: dto.question, options: dto.options ?? null, answer: dto.answer };
}

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
      questions: (dto.questions ?? []).map((q) => toQuestion(q)),
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
    if (dto.questions !== undefined) task.questions = dto.questions.map((q) => toQuestion(q));
    if (dto.file !== undefined) {
      task.file = dto.file ?? null;
      task.contentType = dto.file ? TaskContentType.TEXT : null;
    }
    return this.taskRepo.save(task);
  }

  // ── Savollar ──────────────────────────────────────────────────────────────
  //
  // Savollar `jsonb` massivda saqlanadi va o'z id'siga ega emas, shuning uchun
  // ular massivdagi o'rni (`index`, 0 dan boshlab) bilan belgilanadi. Bu
  // usullar bo'lmasa mijoz bitta savolni qo'shish uchun ham butun massivni
  // qayta yuborishga majbur bo'ladi.

  private async loadTask(courseId: string, unitId: string, lessonId: string, taskId: string): Promise<Task> {
    await this.loadLesson(courseId, unitId, lessonId);
    const task = await this.taskRepo.findOne({ where: { id: taskId, lesson: { id: lessonId } } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');
    return task;
  }

  private questionAt(task: Task, index: number): TaskQuestion {
    const question = task.questions?.[index];
    if (!question) throw new NotFoundException('Savol topilmadi');
    return question;
  }

  async addQuestion(
    courseId: string,
    unitId: string,
    lessonId: string,
    taskId: string,
    dto: TaskQuestionDto,
  ): Promise<Task> {
    const task = await this.loadTask(courseId, unitId, lessonId, taskId);
    // Yangi massiv — TypeORM `jsonb` o'zgarishini havola almashgandagina
    // sezadi, joyida `push` qilinsa saqlanmaydi.
    task.questions = [...(task.questions ?? []), toQuestion(dto)];
    return this.taskRepo.save(task);
  }

  async updateQuestion(
    courseId: string,
    unitId: string,
    lessonId: string,
    taskId: string,
    index: number,
    dto: UpdateTaskQuestionDto,
  ): Promise<Task> {
    const task = await this.loadTask(courseId, unitId, lessonId, taskId);
    const current = this.questionAt(task, index);

    task.questions = task.questions.map((q, i) =>
      i === index
        ? {
            question: dto.question ?? current.question,
            // `options` uchun `undefined` — "tegilmadi", `null` — "ochiq
            // javobli qilinsin". Shuning uchun `??` emas, aniq tekshiruv.
            options: dto.options !== undefined ? (dto.options ?? null) : current.options,
            answer: dto.answer ?? current.answer,
          }
        : q,
    );

    return this.taskRepo.save(task);
  }

  async deleteQuestion(
    courseId: string,
    unitId: string,
    lessonId: string,
    taskId: string,
    index: number,
  ): Promise<Task> {
    const task = await this.loadTask(courseId, unitId, lessonId, taskId);
    this.questionAt(task, index);
    task.questions = task.questions.filter((_, i) => i !== index);
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
