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
import { Course } from '@/core/course/entity/course.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';

@Entity('pending_enrollments')
export class PendingEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  @Column({ type: 'enum', enum: PendingEnrollmentStatus, default: PendingEnrollmentStatus.CREATED })
  status: PendingEnrollmentStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  start: Date | null;

  @ManyToOne(() => Enrollment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  enrollment: Enrollment | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
