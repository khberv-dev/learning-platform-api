import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { LiveSession } from '@/core/live-lesson/entity/live-session.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { LiveSessionService } from '@/core/live-lesson/services/live-session.service';
import { LiveLessonController } from '@/core/live-lesson/controllers/live-lesson.controller';
import { LiveSessionController } from '@/core/live-lesson/controllers/live-session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiveLesson, LiveSession, Teacher, Student, Enrollment])],
  controllers: [LiveLessonController, LiveSessionController],
  providers: [LiveLessonService, LiveSessionService],
})
export class LiveLessonModule {}
