import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { CourseService } from '@/core/course/services/course.service';
import { UnitService } from '@/core/course/services/unit.service';
import { LessonService } from '@/core/course/services/lesson.service';
import { CourseController } from '@/core/course/controllers/course.controller';
import { AdminCourseController } from '@/core/course/controllers/admin-course.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Unit, Lesson])],
  controllers: [CourseController, AdminCourseController],
  providers: [CourseService, UnitService, LessonService],
  exports: [CourseService],
})
export class CourseModule {}
