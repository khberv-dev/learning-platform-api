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

  /**
   * Ko'rsatish tartibi — kichikdan kattaga (1, 2, 3...). Admin belgilaydi.
   * Teng bo'lganda `createdAt` bo'yicha saralanadi, shuning uchun tartib
   * belgilanmagan eski bo'limlar avvalgi joyida qoladi.
   */
  @Column({ type: 'int', default: 0 })
  index: number;

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
