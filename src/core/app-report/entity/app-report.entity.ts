import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_reports')
export class AppReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  device: string;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
