import { Check, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';

@Entity('user_activities')
@Unique(['student', 'activityDate'])
@Unique(['mentor', 'activityDate'])
@Unique(['admin', 'activityDate'])
@Check(`(("student_id" IS NOT NULL)::int + ("mentor_id" IS NOT NULL)::int + ("admin_id" IS NOT NULL)::int) = 1`)
export class UserActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  student: Student | null;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE', nullable: true })
  mentor: Mentor | null;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', nullable: true })
  admin: Admin | null;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @Column({ type: 'boolean', default: false })
  hasCourse: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
