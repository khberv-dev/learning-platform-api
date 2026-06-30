import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';

@Entity('progresses')
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.progresses, { onDelete: 'CASCADE' })
  @JoinColumn()
  enrollment: Enrollment;

  @ManyToOne(() => Lesson, (lesson) => lesson.progresses, { onDelete: 'CASCADE' })
  @JoinColumn()
  lesson: Lesson;

  @Column({ type: 'smallint' })
  progress: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
