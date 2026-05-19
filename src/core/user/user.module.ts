import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { TeacherStatusHistory } from '@/core/user/entity/teacher-status-history.entity';
import { TeacherFeedback } from '@/core/user/entity/teacher-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { UserService } from '@/core/user/services/user.service';
import { TeacherService } from '@/core/user/services/teacher.service';
import { StudentService } from '@/core/user/services/student.service';
import { UserController } from '@/core/user/controllers/user.controller';
import { StudentController } from '@/core/user/controllers/student.controller';
import { AdminStudentController } from '@/core/user/controllers/admin-student.controller';
import { TeacherController } from '@/core/user/controllers/teacher.controller';
import { AdminTeacherController } from '@/core/user/controllers/admin-teacher.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Teacher, TeacherStatusHistory, TeacherFeedback, Admin, Student, Assignment]),
  ],
  controllers: [UserController, StudentController, AdminStudentController, TeacherController, AdminTeacherController],
  providers: [UserService, TeacherService, StudentService],
  exports: [UserService],
})
export class UserModule {}
