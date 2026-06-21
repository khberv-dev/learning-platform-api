import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveSessionService } from '@/core/live-lesson/services/live-session.service';
import { UploadLiveSessionDto } from '@/core/live-lesson/dto/upload-live-session.dto';
import { liveSessionStorage, videoFileFilter, toVideoPath } from '@/core/live-lesson/storage/live-session.storage';

const sessionExample = {
  id: 'ls000000-0000-0000-0000-000000000001',
  title: 'Speaking Practice — Session 1',
  videoPath: '/public/live-session/abc123.mp4',
  enrollment: { id: 'en000000-0000-0000-0000-000000000001', course: { id: 'c1', title: 'English A1' } },
  createdAt: '2026-06-21T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z',
};

@ApiTags('live-sessions')
@ApiBearerAuth()
@Controller('live-sessions')
export class LiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  @Post('enrollments/:enrollmentId')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('file', { storage: liveSessionStorage, fileFilter: videoFileFilter }))
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
  @ApiCreatedResponse({ schema: { example: sessionExample } })
  upload(
    @CurrentUser() user: { id: string },
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UploadLiveSessionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.liveSessionService.upload(user.id, enrollmentId, dto.title, toVideoPath(file.filename));
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: [sessionExample] } })
  listMySessions(@CurrentUser() user: { id: string }) {
    return this.liveSessionService.listMySessions(user.id);
  }

  @Get('enrollments/:enrollmentId')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: [sessionExample] } })
  listByEnrollment(
    @CurrentUser() user: { id: string },
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.liveSessionService.listByEnrollment(user.id, enrollmentId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: sessionExample } })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveSessionService.findOne(user.id, id);
  }
}
