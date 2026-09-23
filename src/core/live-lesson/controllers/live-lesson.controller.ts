import { Body, Controller, Post } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';

@Roles(UserRole.MENTOR)
@Controller('mentor/live-lessons')
export class LiveLessonController {
  constructor(private readonly liveLessonService: LiveLessonService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateLiveLessonDto) {
    return this.liveLessonService.create(user.id, dto);
  }
}
