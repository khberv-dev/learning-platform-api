import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Task } from '@/core/course/entity/task.entity';

/**
 * Har bir talaba har bir topshiriq uchun bitta javob yozuvi saqlaydi.
 * Unikal cheklov bir vaqtda kelgan so'rovlar nusxa yaratishining oldini oladi —
 * nusxalar progress foizini 100 dan oshirib yuborardi.
 */
@Entity('task_submissions')
@Unique('UQ_task_submission_student_task', ['student', 'task'])
export class TaskSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn()
  task: Task;

  @Column()
  answer: string;

  @Column()
  isCorrect: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
