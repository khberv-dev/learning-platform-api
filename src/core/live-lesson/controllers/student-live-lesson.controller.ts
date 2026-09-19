import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/live-lessons')
export class StudentLiveLessonController {
  constructor(private readonly liveLessonService: LiveLessonService) {}

  @Get()
  findMy(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.liveLessonService.findForStudent(user.id, query);
  }
}
