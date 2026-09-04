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
import { taskAnswersMatch } from '@/core/course/utils/task-answer.util';

/** Javob varaqasi talabaga ko'rsatilmaydi — faqat savol va variantlar. */
function stripAnswer(question: TaskQuestion) {
  return { question: question.question, options: question.options };
}

/**
 * Topshiriq "to'g'ri yechilgan" hisoblanishi uchun kerak bo'lgan eng kam ulush.
 * Barcha savolga to'g'ri javob shart emas — 80% yetarli.
 */
const PASS_PERCENT = 80;

/** Topshiriq birinchi marta o'tganda beriladigan mukofot. */
const COINS_PER_PASSED_TASK = 5;
const POINTS_PER_PASSED_TASK = 10;

/** Nechta savolga to'g'ri javob berilgan. */
function countCorrect(questions: TaskQuestion[], answers: string[]): number {
  return questions.filter((q, i) => answers[i] !== undefined && taskAnswersMatch(answers[i], q.answer)).length;
}

/**
 * Topshiriq o'tdimi — to'g'ri javoblar ulushi `PASS_PERCENT` dan kam bo'lmasa.
 * Butun sonlarda solishtiriladi: `correct / total >= 0.8` kasr sonlarda
 * 16/20 kabi holatlarda ham xato natija berishi mumkin.
 *
 * Savoli yo'q topshiriqni yechib bo'lmaydi — u hech qachon o'tmaydi.
 */
function isTaskPassed(questions: TaskQuestion[], answers: string[]): boolean {
  if (questions.length === 0) return false;
  return countCorrect(questions, answers) * 100 >= questions.length * PASS_PERCENT;
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
   * `isCorrect` — topshiriq o'tgan-o'tmagani: to'g'ri javoblar `PASS_PERCENT`
   * (80%) dan kam bo'lmasa `true`. Barcha savolga to'g'ri javob shart emas.
   *
   * Topshiriq birinchi marta o'tganda talabaga tanga va ball qo'shiladi
   * (`rewarded: true`). Qayta topshirishda mukofot takrorlanmaydi.
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
      const results: { taskId: string; answers: string[]; isCorrect: boolean; rewarded: boolean }[] = [];
      let rewardedCount = 0;

      for (const taskId of taskIds) {
        const task = taskMap.get(taskId)!;
        const studentAnswers = answers[taskId].map((a) => a.toLowerCase());

        const isCorrect = isTaskPassed(task.questions, studentAnswers);

        // Unikal cheklovga tayangan upsert: parallel so'rovlar nusxa yaratmaydi.
        // `rewarded` bu yerda yangilanmaydi — bir marta berilgan mukofot saqlanadi.
        await manager
          .createQueryBuilder()
          .insert()
          .into(TaskSubmission)
          .values({ student, task, answer: JSON.stringify(studentAnswers), isCorrect })
          .orUpdate(['answer', 'is_correct'], ['student_id', 'task_id'])
          .execute();

        const rewarded = isCorrect && (await this.claimReward(manager, student.id, taskId));
        if (rewarded) rewardedCount++;

        results.push({ taskId, answers: studentAnswers, isCorrect, rewarded });
      }

      if (rewardedCount > 0) {
        await manager.increment(Student, { id: student.id }, 'coins', COINS_PER_PASSED_TASK * rewardedCount);
        await manager.increment(Student, { id: student.id }, 'points', POINTS_PER_PASSED_TASK * rewardedCount);
      }

      for (const lessonId of lessonIds) {
        await this.upsertLessonProgress(manager, student, lessonId);
      }

      return results;
    });
  }

  /**
   * Mukofotni "band qiladi": `rewarded` ni faqat hali berilmagan bo'lsa `true`
   * qiladi va shu yozuvni o'zgartira olgan bo'lsa `true` qaytaradi.
   *
   * Shart bitta UPDATE ichida tekshirilgani uchun bir vaqtda kelgan so'rovlardan
   * faqat bittasi yozuvni o'zgartira oladi — mukofot ikki marta berilmaydi.
   */
  private async claimReward(manager: EntityManager, studentId: string, taskId: string): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(TaskSubmission)
      .set({ rewarded: true })
      .where('student_id = :studentId', { studentId })
      .andWhere('task_id = :taskId', { taskId })
      .andWhere('is_correct = true')
      .andWhere('rewarded = false')
      .execute();

    return result.affected === 1;
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

  /** Bitta topshiriq bo'yicha talabaning savollari va bergan javoblari. */
  async getTaskResult(studentUserId: string, taskId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: { lesson: true } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');

    await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentUserId, task.lesson.id);

    const submission = await this.submissionRepo.findOne({
      where: { student: { id: student.id }, task: { id: task.id } },
    });
    if (!submission) throw new NotFoundException('Topshiriq javobi topilmadi');

    const answers = JSON.parse(submission.answer) as string[];
    return {
      taskId: task.id,
      name: task.name,
      file: task.file,
      contentType: task.contentType,
      questions: task.questions.map((question, index) => ({
        ...stripAnswer(question),
        answer: answers[index] ?? null,
      })),
      isCorrect: submission.isCorrect,
      submittedAt: submission.createdAt,
    };
  }
}
