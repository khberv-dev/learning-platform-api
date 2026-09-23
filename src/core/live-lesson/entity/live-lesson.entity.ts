import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Group } from '@/core/group/entity/group.entity';

@Entity('live_lessons')
export class LiveLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  meetLink: string;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE' })
  @JoinColumn()
  mentor: Mentor;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn()
  group: Group;

  @CreateDateColumn()
  createdAt: Date;
}
