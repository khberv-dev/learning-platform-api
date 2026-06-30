import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';

@Entity('teacher_feedbacks')
export class TeacherFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Teacher, (teacher) => teacher.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn()
  teacher: Teacher;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn()
  student: Student;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'smallint' })
  rate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
