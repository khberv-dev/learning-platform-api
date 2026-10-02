import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unit } from '@/core/course/entity/unit.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Author } from '@/core/author/entity/author.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  index: number;

  @OneToMany(() => Unit, (unit) => unit.course)
  units: Unit[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Plan, (plan) => plan.course)
  plans: Plan[];

  @ManyToMany(() => Author, (author) => author.courses)
  @JoinTable({
    name: 'course_authors',
    joinColumn: { name: 'course_id' },
    inverseJoinColumn: { name: 'author_id' },
  })
  authors: Author[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
