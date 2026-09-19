import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { SessionOs } from '@/core/session/enum/session-os.enum';

@Entity('sessions')
@Check(`(("student_id" IS NOT NULL)::int + ("mentor_id" IS NOT NULL)::int + ("admin_id" IS NOT NULL)::int) = 1`)
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  student: Student | null;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  mentor: Mentor | null;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  admin: Admin | null;

  @Column({ type: 'enum', enum: SessionOs })
  os: SessionOs;

  @Column({ unique: true })
  fcmToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
