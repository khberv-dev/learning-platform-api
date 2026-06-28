import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { StudentLevel } from '@/core/user/enum/student-level.enum';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.student)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @Column({ type: 'enum', enum: StudentLevel, default: StudentLevel.A1 })
  level: StudentLevel;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
