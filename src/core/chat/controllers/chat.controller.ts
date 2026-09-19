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

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatGateway } from '@/core/chat/gateways/chat.gateway';
import { SendMessageDto } from '@/core/chat/dto/send-message.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { CHAT_FILE_MAX_BYTES, chatFileStorage } from '@/core/chat/storage/chat-file.storage';

@Controller(['student/chat', 'mentor/chat', 'admin/chat'])
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms')
  listRooms(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    return this.chatService.listRooms(user, query);
  }

  @Get('rooms/:id')
  getRoom(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.getRoom(user, id);
  }

  @Get('rooms/:id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: PaginationQuery) {
    return this.chatService.listMessages(user, id, query);
  }

  @Post('rooms/:id/messages')
  async sendText(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    const message = await this.chatService.sendText(user, id, dto.text);
    this.chatGateway.broadcastMessage(id, message);
    return message;
  }

  @Post('rooms/:id/messages/file')
  @UseInterceptors(FileInterceptor('file', { storage: chatFileStorage, limits: { fileSize: CHAT_FILE_MAX_BYTES } }))
  async sendFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl yuborilmagan');
    const message = await this.chatService.sendFile(user, id, file);
    this.chatGateway.broadcastMessage(id, message);
    return message;
  }
}
