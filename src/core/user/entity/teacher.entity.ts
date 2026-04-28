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

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.teacher)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  status: TeacherStatus;

  @OneToMany(() => TeacherStatusHistory, (history) => history.teacher)
  statusHistories: TeacherStatusHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
