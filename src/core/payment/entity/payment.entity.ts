import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentType, (paymentType) => paymentType.payments, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn()
  paymentType: PaymentType | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Enrollment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  enrollment: Enrollment | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
