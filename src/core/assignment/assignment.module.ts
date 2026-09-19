import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { ChatModule } from '@/core/chat/chat.module';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { StudentAssignmentController } from '@/core/assignment/controllers/student-assignment.controller';
import { MentorAssignmentController } from '@/core/assignment/controllers/mentor-assignment.controller';
import { AdminAssignmentController } from '@/core/assignment/controllers/admin-assignment.controller';
import { NotificationModule } from '@/core/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Mentor, Student, Enrollment]), ChatModule, NotificationModule],
  controllers: [StudentAssignmentController, MentorAssignmentController, AdminAssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
