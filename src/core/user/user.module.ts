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
import { AdminUserController } from '@/core/user/controllers/admin-user.controller';
import { UserActivity } from '@/core/user/entity/user-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserActivity,
      Teacher,
      TeacherStatusHistory,
      TeacherFeedback,
      Admin,
      Student,
      Assignment,
    ]),
  ],
  // TARTIB MUHIM: `StudentController` (`students/me`) `AdminStudentController`
  // (`students/:id`) dan oldin turishi shart. Ikkalasi ham `students` prefiksida,
  // shuning uchun tartib almashsa `students/me` admin uchun mo'ljallangan
  // `:id` marshrutiga tushib qoladi va talabalar 403 xatosini oladi.
  controllers: [
    UserController,
    StudentController,
    AdminStudentController,
    TeacherController,
    AdminTeacherController,
    AdminUserController,
  ],
  providers: [UserService, TeacherService, StudentService],
  exports: [UserService],
})
export class UserModule {}
