import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { UserRole } from '@/core/user/enum/user-role.enum';

@Entity('users')
export class User {
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

  @OneToOne(() => Student, (student) => student.user, { cascade: true })
  student: Student;

  @OneToOne(() => Teacher, (teacher) => teacher.user, { cascade: true })
  teacher: Teacher;

  @OneToOne(() => Admin, (admin) => admin.user, { cascade: true })
  admin: Admin;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  roles(): UserRole[] {
    const roles: UserRole[] = [];

    if (this.student) {
      roles.push(UserRole.STUDENT);
    }

    if (this.teacher) {
      roles.push(UserRole.TEACHER);
    }

    if (this.admin) {
      roles.push(UserRole.ADMIN);
    }

    return roles;
  }
}
