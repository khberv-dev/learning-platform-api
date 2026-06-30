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
import { Course } from '@/core/course/entity/course.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => Course, (course) => course.units, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  @OneToMany(() => Lesson, (lesson) => lesson.unit)
  lessons: Lesson[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
