import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentHistory } from '@/core/assignment/entity/assignment-history.entity';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { StudentAssignmentController } from '@/core/assignment/controllers/student-assignment.controller';
import { AdminAssignmentController } from '@/core/assignment/controllers/admin-assignment.controller';
import { MentorAssignmentController } from '@/core/assignment/controllers/mentor-assignment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, AssignmentHistory, Subscription, Mentor])],
  controllers: [StudentAssignmentController, AdminAssignmentController, MentorAssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
