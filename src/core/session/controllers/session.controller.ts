import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SessionService } from '@/core/session/services/session.service';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  createSession(@CurrentUser() user: { id: string }, @Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(user.id, dto);
  }

  @Get(':id')
  findOneSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.sessionService.findOneSession(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.sessionService.deleteSession(user.id, id);
  }
}
