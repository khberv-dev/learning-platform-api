import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';

@Entity('group_mentors')
@Unique(['group', 'mentor'])
@Index('UQ_group_primary_mentor', ['group'], { unique: true, where: `"role" = 'primary'` })
export class GroupMentor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn()
  group: Group;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE' })
  @JoinColumn()
  mentor: Mentor;

  @Column({ type: 'enum', enum: GroupMentorRole })
  role: GroupMentorRole;

  @CreateDateColumn()
  createdAt: Date;
}
