import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '@/core/user/entity/user.entity';

@Entity('user_activities')
@Unique(['user', 'activityDate'])
export class UserActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
