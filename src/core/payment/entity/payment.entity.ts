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
import { Plan } from '@/core/plan/entity/plan.entity';

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

  @ManyToOne(() => Plan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  plan: Plan | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status: PaymentStatus;

  /** To'lov tizimidagi tranzaksiya identifikatori (masalan Click click_trans_id). */
  @Column({ nullable: true })
  providerPaymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
