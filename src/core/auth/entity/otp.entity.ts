import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: OtpPurpose, default: OtpPurpose.REGISTRATION })
  purpose: OtpPurpose;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
