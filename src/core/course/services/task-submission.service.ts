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

function stripAnswer(question: TaskQuestion) {
  return { question: question.question, options: question.options };
}

const PASS_PERCENT = 80;

const COINS_PER_PASSED_TASK = 5;
const POINTS_PER_PASSED_TASK = 10;

function countCorrect(questions: TaskQuestion[], answers: string[]): number {
  return questions.filter((q, i) => answers[i] !== undefined && taskAnswersMatch(answers[i], q.answer)).length;
}

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

  async submit(studentId: string, answers: SubmitTasksBody) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const taskIds = Object.keys(answers);
    const tasks = await this.taskRepo.find({ where: { id: In(taskIds) }, relations: { lesson: true } });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const taskId of taskIds) {
      if (!taskMap.has(taskId)) throw new NotFoundException(`Topshiriq topilmadi: ${taskId}`);
    }

    const lessonIds = [...new Set(tasks.map((t) => t.lesson.id))];
    for (const lessonId of lessonIds) {
      await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentId, lessonId);
    }

    return this.dataSource.transaction(async (manager) => {
      const results: { taskId: string; answers: string[]; isCorrect: boolean; rewarded: boolean }[] = [];
      let rewardedCount = 0;

      for (const taskId of taskIds) {
        const task = taskMap.get(taskId)!;
        const studentAnswers = answers[taskId].map((a) => a.toLowerCase());

        const isCorrect = isTaskPassed(task.questions, studentAnswers);

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

  async getLessonResults(studentId: string, lessonId: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentId, lessonId);

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

  async getTaskResult(studentId: string, taskId: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: { lesson: true } });
    if (!task) throw new NotFoundException('Topshiriq topilmadi');

    await assertActiveEnrollmentForLesson(this.enrollmentRepo, studentId, task.lesson.id);

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

  async getStudentLessonResults(studentId: string, lessonId: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    const tasks = await this.taskRepo.find({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
    });

    const submissions = tasks.length
      ? await this.submissionRepo.find({
          where: { student: { id: student.id }, task: { id: In(tasks.map((t) => t.id)) } },
          relations: { task: true },
        })
      : [];
    const submissionMap = new Map(submissions.map((s) => [s.task.id, s]));

    return {
      lesson: { id: lesson.id, title: lesson.title },
      tasks: tasks.map((task) => {
        const submission = submissionMap.get(task.id) ?? null;
        const answers = submission ? (JSON.parse(submission.answer) as string[]) : [];

        return {
          taskId: task.id,
          name: task.name,
          file: task.file,
          contentType: task.contentType,
          isCorrect: submission ? submission.isCorrect : null,
          submittedAt: submission ? submission.createdAt : null,
          questions: task.questions.map((question, index) => {
            const studentAnswer = answers[index] ?? null;

            return {
              question: question.question,
              options: question.options,
              answer: question.answer,
              studentAnswer,
              isCorrect: studentAnswer !== null && taskAnswersMatch(studentAnswer, question.answer),
            };
          }),
        };
      }),
    };
  }
}
