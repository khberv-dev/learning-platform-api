import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { LiveLessonRecordingService } from '@/core/live-lesson/services/live-lesson-recording.service';
import { LiveLessonController } from '@/core/live-lesson/controllers/live-lesson.controller';
import { StudentLiveLessonController } from '@/core/live-lesson/controllers/student-live-lesson.controller';
import { LiveLessonRecordingController } from '@/core/live-lesson/controllers/live-lesson-recording.controller';
import { StudentLiveLessonRecordingController } from '@/core/live-lesson/controllers/student-live-lesson-recording.controller';
import { NotificationModule } from '@/core/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveLesson, LiveLessonRecording, Mentor, Student, Group, GroupMentor]),
    NotificationModule,
  ],
  controllers: [
    LiveLessonController,
    StudentLiveLessonController,
    LiveLessonRecordingController,
    StudentLiveLessonRecordingController,
  ],
  providers: [LiveLessonService, LiveLessonRecordingService],
})
export class LiveLessonModule {}
