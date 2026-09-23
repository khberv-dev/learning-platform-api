import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';

@Entity('activities')
@Unique(['student', 'activityDate'])
export class StudentActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  student: Student;

  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @Column({ type: 'boolean', default: false })
  hasCourse: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
