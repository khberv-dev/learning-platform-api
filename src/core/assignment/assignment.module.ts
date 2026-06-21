import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { ChatModule } from '@/core/chat/chat.module';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { StudentAssignmentController } from '@/core/assignment/controllers/student-assignment.controller';
import { TeacherAssignmentController } from '@/core/assignment/controllers/teacher-assignment.controller';
import { AdminAssignmentController } from '@/core/assignment/controllers/admin-assignment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Teacher, Student, Enrollment]), ChatModule],
  controllers: [StudentAssignmentController, TeacherAssignmentController, AdminAssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
