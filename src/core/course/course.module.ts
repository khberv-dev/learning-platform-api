import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { Task } from '@/core/course/entity/task.entity';
import { TaskSubmission } from '@/core/course/entity/task-submission.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Progress } from '@/core/enrollment/entity/progress.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { CourseService } from '@/core/course/services/course.service';
import { UnitService } from '@/core/course/services/unit.service';
import { LessonService } from '@/core/course/services/lesson.service';
import { TaskService } from '@/core/course/services/task.service';
import { TaskSubmissionService } from '@/core/course/services/task-submission.service';
import { CourseController } from '@/core/course/controllers/course.controller';
import { AdminCourseController } from '@/core/course/controllers/admin-course.controller';
import { TaskSubmissionController } from '@/core/course/controllers/task-submission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Unit, Lesson, Task, TaskSubmission, Student, Progress, Enrollment])],
  controllers: [CourseController, AdminCourseController, TaskSubmissionController],
  providers: [CourseService, UnitService, LessonService, TaskService, TaskSubmissionService],
  exports: [CourseService],
})
export class CourseModule {}
