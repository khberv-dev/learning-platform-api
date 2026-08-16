import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Course } from '@/core/course/entity/course.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';

/**
 * Tashqi xizmat (CRM, terminal) yuborgan yozilish so'rovi — admin tasdiqlagunga
 * qadar kutib turadi. Tasdiqlanganda yozilish, to'lov va tarix yozuvi yaratiladi.
 *
 * Tarif (plan) bu yerda saqlanmaydi: uni admin tasdiqlash paytida tanlaydi,
 * chunki narx va muddat o'sha paytda ma'lum bo'ladi.
 */
@Entity('pending_enrollments')
export class PendingEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  @Column({ type: 'enum', enum: PendingEnrollmentStatus, default: PendingEnrollmentStatus.CREATED })
  status: PendingEnrollmentStatus;

  /** So'ralgan boshlanish sanasi. Berilmasa — tasdiqlangan payt. */
  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  start: Date | null;

  /** So'ralgan tugash sanasi. Berilmasa — boshlanishga tarifdagi oylar qo'shiladi. */
  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  end: Date | null;

  /** Tasdiqlash natijasida ochilgan yozilish — so'rov holatini kuzatish uchun. */
  @ManyToOne(() => Enrollment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  enrollment: Enrollment | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
