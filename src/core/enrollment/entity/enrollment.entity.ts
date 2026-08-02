import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Course } from '@/core/course/entity/course.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { EnrollmentHistory } from '@/core/enrollment/entity/enrollment-history.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, (student) => student.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.CREATED })
  status: EnrollmentStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  start: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  end: Date | null;

  @OneToMany(() => Progress, (progress) => progress.enrollment)
  progresses: Progress[];

  @OneToMany(() => EnrollmentHistory, (history) => history.enrollment)
  histories: EnrollmentHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
