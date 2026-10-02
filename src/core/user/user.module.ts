import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { MentorStatusHistory } from '@/core/user/entity/mentor-status-history.entity';
import { MentorFeedback } from '@/core/user/entity/mentor-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { UserService } from '@/core/user/services/user.service';
import { MentorService } from '@/core/user/services/mentor.service';
import { StudentService } from '@/core/user/services/student.service';
import { StudentController } from '@/core/user/controllers/student.controller';
import { AdminStudentController } from '@/core/user/controllers/admin-student.controller';
import { MentorController } from '@/core/user/controllers/mentor.controller';
import { StudentMentorController } from '@/core/user/controllers/student-mentor.controller';
import { AdminMentorController } from '@/core/user/controllers/admin-mentor.controller';
import { AdminController } from '@/core/user/controllers/admin.controller';
import { StudentActivity } from '@/core/user/entity/student-activity.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';

import { AdminAdminController } from '@/core/user/controllers/admin-admin.controller';
import { AdminService } from '@/core/user/services/admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentActivity,
      Mentor,
      MentorStatusHistory,
      MentorFeedback,
      Admin,
      Student,
      Group,
      GroupMembership,
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
    AdminAdminController,
  ],
  providers: [UserService, MentorService, StudentService, AdminService],
  exports: [UserService],
})
export class UserModule {}
