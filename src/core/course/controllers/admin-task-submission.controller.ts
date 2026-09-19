import { Controller, Get, Param } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TaskSubmissionService } from '@/core/course/services/task-submission.service';

@Roles(UserRole.ADMIN)
@Controller('admin/task-submissions')
export class AdminTaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  @Get('students/:studentId/lessons/:lessonId')
  getStudentLessonResults(@Param('studentId') studentId: string, @Param('lessonId') lessonId: string) {
    return this.taskSubmissionService.getStudentLessonResults(studentId, lessonId);
  }
}
