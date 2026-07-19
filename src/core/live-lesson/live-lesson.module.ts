import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { LiveLessonRecordingService } from '@/core/live-lesson/services/live-lesson-recording.service';
import { LiveLessonController } from '@/core/live-lesson/controllers/live-lesson.controller';
import { LiveLessonRecordingController } from '@/core/live-lesson/controllers/live-lesson-recording.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiveLesson, LiveLessonRecording, Teacher, Student, Assignment])],
  controllers: [LiveLessonController, LiveLessonRecordingController],
  providers: [LiveLessonService, LiveLessonRecordingService],
})
export class LiveLessonModule {}
