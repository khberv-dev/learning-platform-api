import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Group } from '@/core/group/entity/group.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { LiveLessonController } from '@/core/live-lesson/controllers/live-lesson.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiveLesson, Teacher, Group, Assignment])],
  controllers: [LiveLessonController],
  providers: [LiveLessonService],
})
export class LiveLessonModule {}
