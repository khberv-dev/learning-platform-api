import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonRecordingService } from '@/core/live-lesson/services/live-lesson-recording.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/live-lesson-recordings')
export class StudentLiveLessonRecordingController {
  constructor(private readonly liveLessonRecordingService: LiveLessonRecordingService) {}

  @Get('my')
  listMyRecordings(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.liveLessonRecordingService.listMyRecordings(user.id, query);
  }

  @Get('groups/:groupId')
  listByGroup(@CurrentUser() user: { id: string }, @Param('groupId') groupId: string, @Query() query: PaginationQuery) {
    return this.liveLessonRecordingService.listByGroup(user.id, groupId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonRecordingService.findOne(user.id, id);
  }
}
