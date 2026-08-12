import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TaskSubmissionService } from '@/core/course/services/task-submission.service';
import { parseSubmitTasksBody } from '@/core/course/dto/submit-tasks.dto';

@ApiTags('task-submissions')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  @Post()
  @ApiOperation({
    summary: 'Topshiriq javoblarini yuborish',
    description:
      "`isCorrect` — topshiriq o'tgan-o'tmagani: to'g'ri javoblar 80% dan kam " +
      "bo'lmasa `true`. Savoli yo'q topshiriq hech qachon o'tmaydi.\n\n" +
      '`rewarded` — shu topshirish uchun mukofot berilgani: topshiriq birinchi ' +
      "marta o'tganda talabaga +5 tanga va +10 ball qo'shiladi. " +
      'Qayta topshirishda mukofot takrorlanmaydi.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: { type: 'array', items: { type: 'string' } },
      example: {
        'a1b2c3d4-0000-0000-0000-000000000001': ['hello', 'went'],
        'a1b2c3d4-0000-0000-0000-000000000002': ['goodbye'],
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      example: [
        { taskId: 'a1b2c3d4-0000-0000-0000-000000000001', answers: ['hello', 'went'], isCorrect: true, rewarded: true },
        { taskId: 'a1b2c3d4-0000-0000-0000-000000000002', answers: ['goodbye'], isCorrect: false, rewarded: false },
      ],
    },
  })
  submit(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    // Kalitlari dinamik bo'lgani uchun global ValidationPipe bu tanani
    // tekshirmaydi — qo'lda tekshiriladi.
    return this.taskSubmissionService.submit(user.id, parseSubmitTasksBody(body));
  }

  @Get('lessons/:lessonId')
  @ApiOkResponse({
    schema: {
      example: [
        {
          taskId: 'a1b2c3d4-0000-0000-0000-000000000001',
          name: 'Greeting quiz',
          questions: [
            { question: 'Choose the correct greeting.', options: ['Hello', 'Goodbye', 'Thank you'] },
            { question: 'What is the past tense of "go"?', options: null },
          ],
          file: '/task-audio/uuid.mp3',
          contentType: 'audio',
          submission: { answers: ['hello', 'went'], isCorrect: true, submittedAt: '2026-06-20T10:00:00.000Z' },
        },
      ],
    },
  })
  getLessonResults(@CurrentUser() user: { id: string }, @Param('lessonId') lessonId: string) {
    return this.taskSubmissionService.getLessonResults(user.id, lessonId);
  }
}
