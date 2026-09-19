import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { SessionService } from '@/core/session/services/session.service';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';

@Controller(['student/sessions', 'mentor/sessions', 'admin/sessions'])
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  createSession(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(user, dto);
  }

  @Get(':id')
  findOneSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessionService.findOneSession(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.sessionService.deleteSession(user, id);
  }
}
