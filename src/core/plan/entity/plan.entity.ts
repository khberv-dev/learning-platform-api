import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '@/core/course/entity/course.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, (course) => course.plans, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  @Column()
  title: string;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ default: false })
  hasMentor: boolean;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Fiskalizatsiya (soliq cheki) uchun IKPU / MXIK kodi — tasnif.soliq.uz dagi
   * 17 xonali kod. To'ldirilgan bo'lsa, Payme'ga chek tafsilotlari yuboriladi.
   */
  @Column({ nullable: true })
  ikpu: string;

  /** IKPU ichidagi qadoq (package) kodi. */
  @Column({ nullable: true })
  packageCode: string;

  /** QQS stavkasi foizda. */
  @Column({ type: 'int', nullable: true })
  vatPercent: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
