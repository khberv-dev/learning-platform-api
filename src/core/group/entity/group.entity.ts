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
import { Mentor } from '@/core/user/entity/mentor.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'jsonb', nullable: true })
  schedule: Record<string, string[]> | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  course: Course | null;

  @ManyToOne(() => Mentor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  primaryMentor: Mentor | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
