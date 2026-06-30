import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn()
  teacher: Teacher;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @Column({ type: 'jsonb', nullable: true })
  selectedSchedule: Record<string, string[]> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
