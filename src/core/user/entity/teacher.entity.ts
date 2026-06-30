import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';
import { TeacherStatusHistory } from '@/core/user/entity/teacher-status-history.entity';
import { TeacherFeedback } from '@/core/user/entity/teacher-feedback.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.teacher)
  @JoinColumn()
  user: User;

  @Column({ type: 'enum', enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  status: TeacherStatus;

  @Column({ nullable: true })
  profession: string;

  @Column({ nullable: true })
  introVideo: string;

  @Column({ type: 'jsonb', nullable: true })
  schedule: Record<string, string[]> | null;

  @OneToMany(() => TeacherStatusHistory, (history) => history.teacher)
  statusHistories: TeacherStatusHistory[];

  @OneToMany(() => TeacherFeedback, (feedback) => feedback.teacher)
  feedbacks: TeacherFeedback[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
