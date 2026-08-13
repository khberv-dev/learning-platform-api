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

/**
 * Payme tranzaksiyasi. Payme bir to'lovni bir necha bosqichda boshqaradi
 * (create → perform / cancel) va har bir bosqichda avvalgi javob qaytarilishini
 * kutadi, shuning uchun holat alohida jadvalda saqlanadi.
 */
/**
 * Bitta to'lovda ayni paytda faqat bitta kutilayotgan tranzaksiya bo'lishi mumkin.
 * Qisman (partial) unikal indeks buni ma'lumotlar bazasi darajasida kafolatlaydi:
 * ikkita so'rov bir vaqtda kelsa ham ikkinchisi rad etiladi.
 */
@Index(['payment'], { unique: true, where: `"state" = 1` })
@Entity('payme_transactions')
export class PaymeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Payme tomonidagi tranzaksiya identifikatori (so'rovdagi `id`). */
  @Column({ unique: true })
  transactionId: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn()
  payment: Payment;

  /** Summa — tiyinda (Payme shu birlikda ishlaydi, 1 so'm = 100 tiyin). */
  @Column({ type: 'bigint', transformer: { to: (value: number) => value, from: (value: string) => Number(value) } })
  amount: number;

  @Column({ type: 'int', default: PaymeTransactionState.CREATED })
  state: PaymeTransactionState;

  /** Bekor qilish sababi — Payme yuboradi, faqat bekor qilingan tranzaksiyada bo'ladi. */
  @Column({ type: 'int', nullable: true })
  reason: number | null;

  /** So'rovdagi `time` — tranzaksiya Payme tomonda yaratilgan vaqt. */
  @Column({ type: 'timestamp' })
  paymeTime: Date;

  @Column({ type: 'timestamp' })
  createTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  performTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelTime: Date | null;

  /**
   * `SetFiscalData` orqali kelgan fiskal chek ma'lumotlari, turi bo'yicha
   * kalitlangan: `{ PERFORM: {...}, CANCEL: {...} }`. Ichida `fiscal_sign`,
   * `qr_code_url` va boshqalar bo'ladi.
   */
  @Column({ type: 'jsonb', nullable: true })
  fiscalData: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
