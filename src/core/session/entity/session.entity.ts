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
import { SessionOs } from '@/core/session/enum/session-os.enum';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'enum', enum: SessionOs })
  os: SessionOs;

  /** Push xabarnomalar uchun FCM qurilma tokeni — bitta qurilmaga bitta sessiya. */
  @Column({ unique: true })
  fcmToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
