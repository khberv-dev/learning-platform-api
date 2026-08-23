import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonRecordingService } from '@/core/live-lesson/services/live-lesson-recording.service';
import { UploadLiveLessonRecordingDto } from '@/core/live-lesson/dto/upload-live-lesson-recording.dto';
import {
  liveLessonRecordingStorage,
  videoFileFilter,
  toVideoUrl,
} from '@/core/live-lesson/storage/live-lesson-recording.storage';

@Controller('live-lesson-recordings')
export class LiveLessonRecordingController {
  constructor(private readonly liveLessonRecordingService: LiveLessonRecordingService) {}

  @Post('assignments/:assignmentId')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('file', { storage: liveLessonRecordingStorage, fileFilter: videoFileFilter }))
  upload(
    @CurrentUser() user: { id: string },
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UploadLiveLessonRecordingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.liveLessonRecordingService.upload(user.id, assignmentId, dto.title, toVideoUrl(file.filename));
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  listMyRecordings(@CurrentUser() user: { id: string }) {
    return this.liveLessonRecordingService.listMyRecordings(user.id);
  }

  @Get('assignments/:assignmentId')
  @Roles(UserRole.STUDENT)
  listByAssignment(@CurrentUser() user: { id: string }, @Param('assignmentId') assignmentId: string) {
    return this.liveLessonRecordingService.listByAssignment(user.id, assignmentId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonRecordingService.findOne(user.id, id);
  }
}
