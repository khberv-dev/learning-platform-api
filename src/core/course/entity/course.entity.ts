import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Unit } from '@/core/course/entity/unit.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { Plan } from '@/core/plan/entity/plan.entity';

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

  /**
   * Ko'rsatish tartibi — kichikdan kattaga (1, 2, 3...). Admin belgilaydi.
   * Teng bo'lganda yangi kurslar oldinda turadi (`createdAt` DESC), shuning
   * uchun tartib belgilanmagan eski kurslar avvalgi joyida qoladi.
   */
  @Column({ type: 'int', default: 0 })
  index: number;

  @OneToMany(() => Unit, (unit) => unit.course)
  units: Unit[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Plan, (plan) => plan.course)
  plans: Plan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
