import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { AssignmentHistory } from '@/core/assignment/entity/assignment-history.entity';
import type { AssignmentSchedule } from '@/core/assignment/utils/assignment-schedule.util';

@Entity('assignments')
@Unique(['subscription'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @ManyToOne(() => Mentor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  mentor: Mentor | null;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn()
  subscription: Subscription;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  start: Date | null;

  @Column({ type: 'jsonb' })
  schedule: AssignmentSchedule;

  @OneToMany(() => AssignmentHistory, (history) => history.assignment)
  histories: AssignmentHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
