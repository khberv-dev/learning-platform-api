import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { SessionOs } from '@/core/session/enum/session-os.enum';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  student: Student;

  @Column({ type: 'enum', enum: SessionOs })
  os: SessionOs;

  @Column({ unique: true })
  fcmToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
