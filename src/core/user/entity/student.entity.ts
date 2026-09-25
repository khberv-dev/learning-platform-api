import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { StudentLevel } from '@/core/user/enum/student-level.enum';
import { Gender } from '@/core/user/enum/gender.enum';
import { Group } from '@/core/group/entity/group.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  phoneNumber: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ type: 'enum', enum: StudentLevel, default: StudentLevel.A1 })
  level: StudentLevel;

  @Column({ type: 'enum', enum: Gender, default: Gender.MALE })
  gender: Gender;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  group: Group | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
