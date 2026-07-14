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
import { Unit } from '@/core/course/entity/unit.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { Task } from '@/core/course/entity/task.entity';
import { Material } from '@/core/material/entity/material.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  media: string;

  @ManyToOne(() => Unit, (unit) => unit.lessons, { onDelete: 'CASCADE' })
  @JoinColumn()
  unit: Unit;

  @OneToMany(() => Progress, (progress) => progress.lesson)
  progresses: Progress[];

  @OneToMany(() => Task, (task) => task.lesson)
  tasks: Task[];

  @OneToMany(() => Material, (material) => material.lesson)
  materials: Material[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
