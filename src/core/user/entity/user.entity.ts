import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { UserRole } from '@/core/user/enum/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  phoneNumber: string;

  @Column()
  password: string;

  @OneToOne(() => Student, (student) => student.user, { cascade: true })
  student: Student;

  @OneToOne(() => Teacher, (teacher) => teacher.user, { cascade: true })
  teacher: Teacher;

  @OneToOne(() => Admin, (admin) => admin.user, { cascade: true })
  admin: Admin;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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
