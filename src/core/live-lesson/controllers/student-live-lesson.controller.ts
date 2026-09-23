import { Controller, Get } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';

@Roles(UserRole.STUDENT)
@Controller('student/live-lessons')
export class StudentLiveLessonController {
  constructor(private readonly liveLessonService: LiveLessonService) {}

  @Get('latest')
  findLatest(@CurrentUser() user: { id: string }) {
    return this.liveLessonService.findLatestForStudent(user.id);
  }
}
