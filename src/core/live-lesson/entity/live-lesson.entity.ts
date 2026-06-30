import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Entity('live_lessons')
export class LiveLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  meetLink: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn()
  teacher: Teacher;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn()
  assignment: Assignment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
