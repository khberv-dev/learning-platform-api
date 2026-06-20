import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskSubmission } from '@/core/course/entity/task-submission.entity';
import { Task } from '@/core/course/entity/task.entity';
import { Student } from '@/core/user/entity/student.entity';

@Injectable()
export class TaskSubmissionService {
  constructor(
    @InjectRepository(TaskSubmission) private readonly submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  async submit(studentUserId: string, answers: Record<string, string>) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const taskIds = Object.keys(answers);
    const tasks = await this.taskRepo.findBy({ id: In(taskIds) });

    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const submissions = await Promise.all(
      taskIds.map(async (taskId) => {
        const task = taskMap.get(taskId);
        if (!task) throw new NotFoundException(`Topshiriq topilmadi: ${taskId}`);

        const studentAnswer = answers[taskId].toLowerCase();
        const isCorrect = studentAnswer === task.answer.toLowerCase();

        const existing = await this.submissionRepo.findOne({
          where: { student: { id: student.id }, task: { id: taskId } },
        });

        return this.submissionRepo.save({
          ...existing,
          student,
          task,
          answer: studentAnswer,
          isCorrect,
        });
      }),
    );

    return submissions.map((s) => ({
      taskId: s.task.id,
      answer: s.answer,
      isCorrect: s.isCorrect,
    }));
  }
}
