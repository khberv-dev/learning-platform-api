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

const exactlyOne = (prefix: string) =>
  `(("${prefix}_student_id" IS NOT NULL)::int + ("${prefix}_mentor_id" IS NOT NULL)::int + ("${prefix}_admin_id" IS NOT NULL)::int) = 1`;

@Entity('calls')
@Check(exactlyOne('peer_a'))
@Check(exactlyOne('peer_b'))
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_a_student_id' })
  peerAStudent: Student | null;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_a_mentor_id' })
  peerAMentor: Mentor | null;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_a_admin_id' })
  peerAAdmin: Admin | null;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_b_student_id' })
  peerBStudent: Student | null;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_b_mentor_id' })
  peerBMentor: Mentor | null;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'peer_b_admin_id' })
  peerBAdmin: Admin | null;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
