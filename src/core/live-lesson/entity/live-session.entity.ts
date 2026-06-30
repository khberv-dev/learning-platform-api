import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Entity('live_sessions')
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  videoPath: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn()
  assignment: Assignment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
