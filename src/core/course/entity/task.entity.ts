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
import { TaskContentType } from '@/core/course/enum/task-content-type.enum';

export interface TaskQuestion {
  question: string;
  options: string[] | null;
  answer: string;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'jsonb', default: [] })
  questions: TaskQuestion[];

  @Column({ type: 'varchar', nullable: true })
  file: string | null;

  @Column({ type: 'enum', enum: TaskContentType, nullable: true })
  contentType: TaskContentType | null;

  @ManyToOne(() => Lesson, (lesson) => lesson.tasks, { onDelete: 'CASCADE' })
  @JoinColumn()
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
