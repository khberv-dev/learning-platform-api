import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';
import { Purchase } from '@/core/payment/entity/purchase.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentType, (paymentType) => paymentType.payments, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn()
  paymentType: PaymentType | null;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @OneToMany(() => Purchase, (purchase) => purchase.payment)
  purchases: Purchase[];

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status: PaymentStatus;

  @Column({ nullable: true })
  providerPaymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
