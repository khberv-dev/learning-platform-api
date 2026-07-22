import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskSubmission } from '@/core/course/entity/task-submission.entity';
import { Task } from '@/core/course/entity/task.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';

@Injectable()
export class TaskSubmissionService {
  constructor(
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Progress) private readonly progressRepo: Repository<Progress>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  // answers: { [taskId]: string[] } — one answer string per question in order
  async submit(studentUserId: string, answers: Record<string, string[]>) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const taskIds = Object.keys(answers);
    const tasks = await this.taskRepo.find({ where: { id: In(taskIds) }, relations: { lesson: true } });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const submissions = await Promise.all(
      taskIds.map(async (taskId) => {
        const task = taskMap.get(taskId);
        if (!task) throw new NotFoundException(`Topshiriq topilmadi: ${taskId}`);

        const studentAnswers = answers[taskId].map((a) => a.toLowerCase());
        const isCorrect = task.questions.every(
          (q, i) => studentAnswers[i] !== undefined && studentAnswers[i] === q.answer.toLowerCase(),
        );

        const existing = await this.submissionRepo.findOne({
          where: { student: { id: student.id }, task: { id: taskId } },
        });

        return this.submissionRepo.save({
          ...existing,
          student,
          task,
          answer: JSON.stringify(studentAnswers),
          isCorrect,
        });
      }),
    );

    const lessonIds = [...new Set(tasks.map((t) => t.lesson.id))];
    await Promise.all(lessonIds.map((lessonId) => this.upsertLessonProgress(student, lessonId)));

    return submissions.map((s) => ({
      taskId: s.task.id,
      answers: JSON.parse(s.answer),
      isCorrect: s.isCorrect,
    }));
  }

  private async upsertLessonProgress(student: Student, lessonId: string): Promise<void> {
    const totalTasks = await this.taskRepo.count({ where: { lesson: { id: lessonId } } });
    if (totalTasks === 0) return;

    const correctCount = await this.submissionRepo.count({
      where: { student: { id: student.id }, task: { lesson: { id: lessonId } }, isCorrect: true },
    });

    const lessonProgress = Math.round((correctCount / totalTasks) * 100);

    const enrollment = await this.enrollmentRepo.findOne({
      where: { student: { id: student.id }, course: { units: { lessons: { id: lessonId } } } },
    });
    if (!enrollment) return;

    const existing = await this.progressRepo.findOne({
      where: { enrollment: { id: enrollment.id }, lesson: { id: lessonId } },
    });

    await this.progressRepo.save({
      ...existing,
      enrollment,
      lesson: { id: lessonId },
      progress: lessonProgress,
    });
  }

  async getLessonResults(studentUserId: string, lessonId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

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
        questions: task.questions,
        file: task.file,
        contentType: task.contentType,
        submission: submission
          ? {
              answers: JSON.parse(submission.answer),
              isCorrect: submission.isCorrect,
              submittedAt: submission.createdAt,
            }
          : null,
      };
    });
  }
}
