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
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column()
  answer: string;

  @Column({ name: 'is_correct' })
  isCorrect: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
