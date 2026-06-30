import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';

@Entity('teacher_status_histories')
export class TeacherStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.statusHistories, { onDelete: 'CASCADE' })
  @JoinColumn()
  teacher: Teacher;

  @Column({ type: 'enum', enum: TeacherStatus, nullable: true })
  oldStatus: TeacherStatus | null;

  @Column({ type: 'enum', enum: TeacherStatus })
  newStatus: TeacherStatus;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  changedBy: Admin | null;

  @CreateDateColumn()
  changedAt: Date;
}
