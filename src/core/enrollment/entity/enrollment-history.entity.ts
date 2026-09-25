import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';

@Entity('enrollment_histories')
export class EnrollmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Enrollment, (enrollment) => enrollment.histories, { onDelete: 'CASCADE' })
  @JoinColumn()
  enrollment: Enrollment;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  purchaseAmount: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  start: Date;

  @CreateDateColumn()
  createdAt: Date;
}
