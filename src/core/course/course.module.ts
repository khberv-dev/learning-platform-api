import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '@/core/course/entity/course.entity';
import { Unit } from '@/core/course/entity/unit.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { CourseService } from '@/core/course/service/course.service';
import { UnitService } from '@/core/course/service/unit.service';
import { LessonService } from '@/core/course/service/lesson.service';
import { CourseController } from '@/core/course/controller/course.controller';
import { AdminCourseController } from '@/core/course/controller/admin-course.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Unit, Lesson])],
  controllers: [CourseController, AdminCourseController],
  providers: [CourseService, UnitService, LessonService],
})
export class CourseModule {}
