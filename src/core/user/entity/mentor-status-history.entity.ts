import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';

@Entity('mentor_status_histories')
export class MentorStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mentor, (mentor) => mentor.statusHistories, { onDelete: 'CASCADE' })
  @JoinColumn()
  mentor: Mentor;

  @Column({ type: 'enum', enum: MentorStatus, nullable: true })
  oldStatus: MentorStatus | null;

  @Column({ type: 'enum', enum: MentorStatus })
  newStatus: MentorStatus;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  changedBy: Admin | null;

  @CreateDateColumn()
  changedAt: Date;
}
