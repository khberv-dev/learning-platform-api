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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
