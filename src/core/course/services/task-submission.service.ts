import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { TaskSubmission } from '@/core/course/entity/task-submission.entity';
import { Task, TaskQuestion } from '@/core/course/entity/task.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { assertActiveEnrollmentForLesson } from '@/core/enrollment/utils/enrollment.util';
import { SubmitTasksBody } from '@/core/course/dto/submit-tasks.dto';

/** Javob varaqasi talabaga ko'rsatilmaydi — faqat savol va variantlar. */
function stripAnswer(question: TaskQuestion) {
  return { question: question.question, options: question.options };
}

@Injectable()
export class TaskSubmissionService {
  constructor(
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Topshiriq javoblarini saqlaydi va tegishli darslarning progressini yangilaydi.
   *
   * Hammasi bitta tranzaksiyada: bir topshiriq topilmasa, oldingilari ham
   * saqlanmaydi — aks holda so'rov xato qaytarsa ham ma'lumot o'zgarib qolardi.
   */
  async submit(studentUserId: string, answers: SubmitTasksBody) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const taskIds = Object.keys(answers);
    const tasks = await this.taskRepo.find({ where: { id: In(taskIds) }, relations: { lesson: true } });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const taskId of taskIds) {
      if (!taskMap.has(taskId)) throw new NotFoundException(`Topshiriq topilmadi: ${taskId}`);
    }

    // Talaba faqat o'zi yozilgan kursning topshirig'ini yechishi mumkin.
    const lessonIds = [...new Set(tasks.map((t) => t.lesson.id))];
    for (const lessonId of lessonIds) {
      await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentUserId, lessonId);
    }

    return this.dataSource.transaction(async (manager) => {
      const results: { taskId: string; answers: string[]; isCorrect: boolean }[] = [];

      for (const taskId of taskIds) {
        const task = taskMap.get(taskId)!;
        const studentAnswers = answers[taskId].map((a) => a.toLowerCase());

        // Savoli yo'q topshiriqni yechib bo'lmaydi — `[].every()` doim `true`
        // qaytargani uchun ilgari bunday topshiriq avtomatik "to'g'ri" bo'lardi.
        const isCorrect =
          task.questions.length > 0 &&
          task.questions.every(
            (q, i) => studentAnswers[i] !== undefined && studentAnswers[i] === q.answer.toLowerCase(),
          );

        // Unikal cheklovga tayangan upsert: parallel so'rovlar nusxa yaratmaydi.
        await manager
          .createQueryBuilder()
          .insert()
          .into(TaskSubmission)
          .values({ student, task, answer: JSON.stringify(studentAnswers), isCorrect })
          .orUpdate(['answer', 'is_correct'], ['student_id', 'task_id'])
          .execute();

        results.push({ taskId, answers: studentAnswers, isCorrect });
      }

      for (const lessonId of lessonIds) {
        await this.upsertLessonProgress(manager, student, lessonId);
      }

      return results;
    });
  }

  /**
   * Dars progressi = to'g'ri yechilgan topshiriqlar ulushi (0–100).
   * Savoli yo'q topshiriqlar hisobga olinmaydi — ularni yechib bo'lmaydi,
   * shuning uchun ular bo'lsa ham progress 100 ga yeta oladi.
   */
  private async upsertLessonProgress(manager: EntityManager, student: Student, lessonId: string): Promise<void> {
    const totalTasks = await manager
      .createQueryBuilder(Task, 'task')
      .leftJoin('task.lesson', 'lesson')
      .where('lesson.id = :lessonId', { lessonId })
      .andWhere('jsonb_array_length(task.questions) > 0')
      .getCount();
    if (totalTasks === 0) return;

    const correctCount = await manager.getRepository(TaskSubmission).count({
      where: { student: { id: student.id }, task: { lesson: { id: lessonId } }, isCorrect: true },
    });

    const lessonProgress = Math.min(100, Math.round((correctCount / totalTasks) * 100));

    const enrollment = await manager.getRepository(Enrollment).findOne({
      where: { student: { id: student.id }, course: { units: { lessons: { id: lessonId } } } },
    });
    if (!enrollment) return;

    const existing = await manager.getRepository(Progress).findOne({
      where: { enrollment: { id: enrollment.id }, lesson: { id: lessonId } },
    });

    await manager.getRepository(Progress).save({
      ...existing,
      enrollment,
      lesson: { id: lessonId },
      progress: lessonProgress,
    });
  }

  /** Dars topshiriqlari va talabaning javoblari — to'g'ri javoblarsiz. */
  async getLessonResults(studentUserId: string, lessonId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentUserId, lessonId);

    const tasks = await this.taskRepo.find({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({
      where: { student: { id: student.id }, task: { id: In(tasks.map((t) => t.id)) } },
      relations: { task: true },
    });

    const submissionMap = new Map(submissions.map((s) => [s.task.id, s]));

    return tasks.map((task) => {
      const submission = submissionMap.get(task.id) ?? null;
      return {
        taskId: task.id,
        name: task.name,
        questions: task.questions.map(stripAnswer),
        file: task.file,
        contentType: task.contentType,
        submission: submission
          ? {
              answers: JSON.parse(submission.answer) as string[],
              isCorrect: submission.isCorrect,
              submittedAt: submission.createdAt,
            }
          : null,
      };
    });
  }
}
