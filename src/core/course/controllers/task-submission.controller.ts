import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TaskSubmissionService } from '@/core/course/services/task-submission.service';

@ApiTags('task-submissions')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  @Post()
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
        { taskId: 'a1b2c3d4-0000-0000-0000-000000000001', answers: ['hello', 'went'], isCorrect: true },
        { taskId: 'a1b2c3d4-0000-0000-0000-000000000002', answers: ['goodbye'], isCorrect: false },
      ],
    },
  })
  submit(@CurrentUser() user: { id: string }, @Body() answers: Record<string, string[]>) {
    return this.taskSubmissionService.submit(user.id, answers);
  }

  @Get('lessons/:lessonId')
  @ApiOkResponse({
    schema: {
      example: [
        {
          taskId: 'a1b2c3d4-0000-0000-0000-000000000001',
          questions: [
            { question: 'Choose the correct greeting.', options: ['Hello', 'Goodbye', 'Thank you'], answer: 'Hello' },
            { question: 'What is the past tense of "go"?', options: null, answer: 'went' },
          ],
          file: 'task-audio/uuid.mp3',
          fileType: 'audio',
          submission: { answers: ['hello', 'went'], isCorrect: true, submittedAt: '2026-06-20T10:00:00.000Z' },
        },
      ],
    },
  })
  getLessonResults(@CurrentUser() user: { id: string }, @Param('lessonId') lessonId: string) {
    return this.taskSubmissionService.getLessonResults(user.id, lessonId);
  }
}
