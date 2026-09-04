import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TaskSubmissionService } from '@/core/course/services/task-submission.service';
import { parseSubmitTasksBody } from '@/core/course/dto/submit-tasks.dto';

@Roles(UserRole.STUDENT)
@Controller('task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  @Post()
  submit(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    // Kalitlari dinamik bo'lgani uchun global ValidationPipe bu tanani
    // tekshirmaydi — qo'lda tekshiriladi.
    return this.taskSubmissionService.submit(user.id, parseSubmitTasksBody(body));
  }

  @Get('lessons/:lessonId')
  getLessonResults(@CurrentUser() user: { id: string }, @Param('lessonId') lessonId: string) {
    return this.taskSubmissionService.getLessonResults(user.id, lessonId);
  }

  /**
   * Admin talabaning javoblarini ko'radi. Sinfdagi `@Roles(STUDENT)` shu
   * metodda `@Roles(ADMIN)` bilan almashtiriladi (`getAllAndOverride`), shuning
   * uchun bu yo'lga faqat admin kira oladi.
   *
   * `:taskId` dan oldin e'lon qilinadi — yo'llar e'lon tartibida solishtiriladi.
   */
  @Roles(UserRole.ADMIN)
  @Get('students/:studentId/lessons/:lessonId')
  getStudentLessonResults(@Param('studentId') studentId: string, @Param('lessonId') lessonId: string) {
    return this.taskSubmissionService.getStudentLessonResults(studentId, lessonId);
  }

  @Get(':taskId')
  getTaskResult(@CurrentUser() user: { id: string }, @Param('taskId') taskId: string) {
    return this.taskSubmissionService.getTaskResult(user.id, taskId);
  }
}
