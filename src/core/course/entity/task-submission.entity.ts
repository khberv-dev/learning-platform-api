import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Task } from '@/core/course/entity/task.entity';

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

  @Column({ type: 'int', default: 0 })
  coinsEarned: number;

  @Column({ default: false })
  pointsRewarded: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
