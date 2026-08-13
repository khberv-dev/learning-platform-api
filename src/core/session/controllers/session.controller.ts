import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SessionService } from '@/core/session/services/session.service';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';

const sessionExample = {
  id: 'se000000-0000-0000-0000-000000000001',
  user: { id: '11111111-2222-3333-4444-555555555555' },
  os: 'android',
  fcmToken: 'fH9x_2QwT0aY:APA91bH...',
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedAt: '2026-08-13T10:00:00.000Z',
};

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: sessionExample } })
  createSession(@CurrentUser() user: { id: string }, @Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(user.id, dto);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: sessionExample } })
  findOneSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sessionService.findOneSession(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async deleteSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.sessionService.deleteSession(user.id, id);
  }
}
