import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssessmentService } from '@/core/assessment/services/assessment.service';
import { assessmentInputStorage, audioFileFilter } from '@/core/assessment/storage/assessment.storage';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const conversationExample = {
  id: 'co000000-0000-0000-0000-000000000001',
  createdAt: '2026-05-24T09:00:00.000Z',
  updatedAt: '2026-05-24T09:05:00.000Z',
};

const userMessageExample = {
  id: 'me000000-0000-0000-0000-0000000000a1',
  role: 'user',
  text: 'Hi! I just got back from a trip to Samarkand.',
  audioPath: '/assessment-input/2f9c.webm',
  createdAt: '2026-05-24T09:05:00.000Z',
};

const assistantMessageExample = {
  id: 'me000000-0000-0000-0000-0000000000a2',
  role: 'assistant',
  text: "Oh nice, Samarkand is gorgeous! What was the highlight for you — the Registan, or the food?",
  audioPath: '/assessment-output/7b1d.wav',
  createdAt: '2026-05-24T09:05:02.000Z',
};

const conversationListExample = {
  data: [conversationExample],
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const conversationDetailExample = {
  ...conversationExample,
  messages: [userMessageExample, assistantMessageExample],
};

@ApiTags('assessments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('conversations')
  @ApiCreatedResponse({ schema: { example: conversationExample } })
  createConversation(@CurrentUser() user: { id: string }) {
    return this.assessmentService.createConversation(user.id);
  }

  @Get('conversations')
  @ApiOkResponse({ schema: { example: conversationListExample } })
  listConversations(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.assessmentService.listConversations(user.id, query);
  }

  @Get('conversations/:id')
  @ApiOkResponse({ schema: { example: conversationDetailExample } })
  getConversation(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assessmentService.getConversation(user.id, id);
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(FileInterceptor('audio', { storage: assessmentInputStorage, fileFilter: audioFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['audio'], properties: { audio: { type: 'string', format: 'binary' } } },
  })
  @ApiCreatedResponse({
    schema: { example: { userMessage: userMessageExample, assistantMessage: assistantMessageExample } },
  })
  sendTurn(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Audio fayl yuborilmagan');
    return this.assessmentService.sendTurn(user.id, id, file);
  }
}
