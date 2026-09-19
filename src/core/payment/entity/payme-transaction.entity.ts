import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { PaymeTransactionState } from '@/core/payment/enum/payme-transaction-state.enum';

@Index(['payment'], { unique: true, where: `"state" = 1` })
@Entity('payme_transactions')
export class PaymeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn()
  payment: Payment;

  @Column({ type: 'bigint', transformer: { to: (value: number) => value, from: (value: string) => Number(value) } })
  amount: number;

  @Column({ type: 'int', default: PaymeTransactionState.CREATED })
  state: PaymeTransactionState;

  @Column({ type: 'int', nullable: true })
  reason: number | null;

  @Column({ type: 'timestamp' })
  paymeTime: Date;

  @Column({ type: 'timestamp' })
  createTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  performTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelTime: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  fiscalData: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
