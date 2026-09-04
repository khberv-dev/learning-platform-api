import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssessmentService } from '@/core/assessment/services/assessment.service';
import { assessmentInputStorage, audioFileFilter } from '@/core/assessment/storage/assessment.storage';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('assessments')
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly configService: ConfigService,
  ) {}

  @Get('assembly-ai-key')
  getAssemblyAiKey() {
    return { apiKey: this.configService.getOrThrow<string>('ASSEMBLYAI_API_KEY') };
  }

  @Post('conversations')
  createConversation(@CurrentUser() user: { id: string }) {
    return this.assessmentService.createConversation(user.id);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.assessmentService.listConversations(user.id, query);
  }

  @Get('conversations/:id')
  getConversation(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assessmentService.getConversation(user.id, id);
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(FileInterceptor('audio', { storage: assessmentInputStorage, fileFilter: audioFileFilter }))
  sendTurn(@CurrentUser() user: { id: string }, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Audio fayl yuborilmagan');
    return this.assessmentService.sendTurn(user.id, id, file);
  }
}
