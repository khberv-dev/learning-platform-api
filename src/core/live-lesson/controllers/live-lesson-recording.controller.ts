import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
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

@Roles(UserRole.MENTOR)
@Controller('mentor/live-lesson-recordings')
export class LiveLessonRecordingController {
  constructor(private readonly liveLessonRecordingService: LiveLessonRecordingService) {}

  @Post('groups/:groupId')
  @UseInterceptors(FileInterceptor('file', { storage: liveLessonRecordingStorage, fileFilter: videoFileFilter }))
  upload(
    @CurrentUser() user: { id: string },
    @Param('groupId') groupId: string,
    @Body() dto: UploadLiveLessonRecordingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.liveLessonRecordingService.upload(user.id, groupId, dto.title, toVideoUrl(file.filename));
  }
}
