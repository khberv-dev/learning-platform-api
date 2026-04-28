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

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, (student) => student.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Course, (course) => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'start_date', type: 'timestamp' })
  start: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  end: Date;

  @OneToMany(() => Progress, (progress) => progress.enrollment)
  progresses: Progress[];

  @OneToMany(() => EnrollmentHistory, (history) => history.enrollment)
  histories: EnrollmentHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
