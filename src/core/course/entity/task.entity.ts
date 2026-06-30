import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lesson } from '@/core/course/entity/lesson.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  task: string;

  @Column({ type: 'text', array: true, nullable: true })
  options: string[] | null;

  @Column()
  answer: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.tasks, { onDelete: 'CASCADE' })
  @JoinColumn()
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
