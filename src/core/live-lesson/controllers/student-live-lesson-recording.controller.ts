import { Controller, Get, Param } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonRecordingService } from '@/core/live-lesson/services/live-lesson-recording.service';

@Roles(UserRole.STUDENT)
@Controller('student/live-lesson-recordings')
export class StudentLiveLessonRecordingController {
  constructor(private readonly liveLessonRecordingService: LiveLessonRecordingService) {}

  @Get('my')
  listMyRecordings(@CurrentUser() user: { id: string }) {
    return this.liveLessonRecordingService.listMyRecordings(user.id);
  }

  @Get('assignments/:assignmentId')
  listByAssignment(@CurrentUser() user: { id: string }, @Param('assignmentId') assignmentId: string) {
    return this.liveLessonRecordingService.listByAssignment(user.id, assignmentId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonRecordingService.findOne(user.id, id);
  }
}
