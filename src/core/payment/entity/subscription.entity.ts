import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Course } from '@/core/course/entity/course.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @ManyToOne(() => Course, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  course: Course | null;

  @ManyToOne(() => Plan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  plan: Plan | null;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  start: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  end: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
