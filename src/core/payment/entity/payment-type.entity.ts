import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Payment } from '@/core/payment/entity/payment.entity';

@Entity('payment_types')
export class PaymentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  icon: string;

  @Column()
  title: string;

  @Column()
  url: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Payment, (payment) => payment.paymentType)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
