import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';
import { Subscription } from '@/core/payment/entity/subscription.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.purchases, { onDelete: 'CASCADE' })
  @JoinColumn()
  payment: Payment;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  subscription: Subscription | null;

  @CreateDateColumn()
  createdAt: Date;
}
