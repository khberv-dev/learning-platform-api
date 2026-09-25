import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { Gender } from '@/core/user/enum/gender.enum';
import { MentorStatusHistory } from '@/core/user/entity/mentor-status-history.entity';
import { MentorFeedback } from '@/core/user/entity/mentor-feedback.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';

@Entity('mentors')
export class Mentor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, unique: true })
  phoneNumber: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: MentorStatus, default: MentorStatus.WORKING })
  status: MentorStatus;

  @Column({ type: 'enum', enum: GroupMentorRole, default: GroupMentorRole.SUPPORT })
  role: GroupMentorRole;

  @Column({ type: 'enum', enum: Gender, default: Gender.MALE })
  gender: Gender;

  @Column({ nullable: true })
  introVideo: string;

  @OneToMany(() => MentorStatusHistory, (history) => history.mentor)
  statusHistories: MentorStatusHistory[];

  @OneToMany(() => MentorFeedback, (feedback) => feedback.mentor)
  feedbacks: MentorFeedback[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
