import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { MentorStatusHistory } from '@/core/user/entity/mentor-status-history.entity';
import { MentorFeedback } from '@/core/user/entity/mentor-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { UserService } from '@/core/user/services/user.service';
import { MentorService } from '@/core/user/services/mentor.service';
import { StudentService } from '@/core/user/services/student.service';
import { StudentController } from '@/core/user/controllers/student.controller';
import { AdminStudentController } from '@/core/user/controllers/admin-student.controller';
import { MentorController } from '@/core/user/controllers/mentor.controller';
import { StudentMentorController } from '@/core/user/controllers/student-mentor.controller';
import { AdminMentorController } from '@/core/user/controllers/admin-mentor.controller';
import { AdminController } from '@/core/user/controllers/admin.controller';
import { UserActivity } from '@/core/user/entity/user-activity.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserActivity,
      Mentor,
      MentorStatusHistory,
      MentorFeedback,
      Admin,
      Student,
      Assignment,
      Enrollment,
    ]),
  ],
  controllers: [
    StudentController,
    AdminStudentController,
    MentorController,
    StudentMentorController,
    AdminMentorController,
    AdminController,
  ],
  providers: [UserService, MentorService, StudentService],
  exports: [UserService],
})
export class UserModule {}
