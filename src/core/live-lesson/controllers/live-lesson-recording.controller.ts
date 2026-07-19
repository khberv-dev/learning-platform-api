import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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

const mentorExample = { id: 'u1', firstName: 'John', lastName: 'Doe', avatar: '/public/avatars/john.jpg' };

const recordingExample = {
  id: 'ls000000-0000-0000-0000-000000000001',
  title: 'Speaking Practice — Session 1',
  videoUrl: '/public/live-lesson-recording/abc123.mp4',
  assignment: {
    id: 'as000000-0000-0000-0000-000000000001',
    teacher: { user: mentorExample },
  },
  createdAt: '2026-06-21T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z',
};

@ApiTags('live-lesson-recordings')
@ApiBearerAuth()
@Controller('live-lesson-recordings')
export class LiveLessonRecordingController {
  constructor(private readonly liveLessonRecordingService: LiveLessonRecordingService) {}

  @Post('assignments/:assignmentId')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('file', { storage: liveLessonRecordingStorage, fileFilter: videoFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'file'],
      properties: {
        title: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ schema: { example: recordingExample } })
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
  @ApiOkResponse({ schema: { example: [recordingExample] } })
  listMyRecordings(@CurrentUser() user: { id: string }) {
    return this.liveLessonRecordingService.listMyRecordings(user.id);
  }

  @Get('assignments/:assignmentId')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: [recordingExample] } })
  listByAssignment(@CurrentUser() user: { id: string }, @Param('assignmentId') assignmentId: string) {
    return this.liveLessonRecordingService.listByAssignment(user.id, assignmentId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: recordingExample } })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonRecordingService.findOne(user.id, id);
  }
}
