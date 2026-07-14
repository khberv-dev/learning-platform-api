import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { MaterialType } from '@/core/material/enum/material-type.enum';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ type: 'enum', enum: MaterialType })
  type: MaterialType;

  @ManyToOne(() => Lesson, (lesson) => lesson.materials, { onDelete: 'CASCADE' })
  @JoinColumn()
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
