import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Task } from '@/core/course/entity/task.entity';

@Entity('task_submissions')
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
