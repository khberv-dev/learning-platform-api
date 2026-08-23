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
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatGateway } from '@/core/chat/gateways/chat.gateway';
import { SendMessageDto } from '@/core/chat/dto/send-message.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { CHAT_FILE_MAX_BYTES, chatFileStorage } from '@/core/chat/storage/chat-file.storage';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms')
  listRooms(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.chatService.listRooms(user.id, query);
  }

  @Get('rooms/:id')
  getRoom(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.chatService.getRoom(user.id, id);
  }

  @Get('rooms/:id/messages')
  listMessages(@CurrentUser() user: { id: string }, @Param('id') id: string, @Query() query: PaginationQuery) {
    return this.chatService.listMessages(user.id, id, query);
  }

  @Post('rooms/:id/messages')
  async sendText(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SendMessageDto) {
    const message = await this.chatService.sendText(user.id, id, dto.text);
    this.chatGateway.broadcastMessage(id, message);
    return message;
  }

  @Post('rooms/:id/messages/file')
  @UseInterceptors(FileInterceptor('file', { storage: chatFileStorage, limits: { fileSize: CHAT_FILE_MAX_BYTES } }))
  async sendFile(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fayl yuborilmagan');
    const message = await this.chatService.sendFile(user.id, id, file);
    this.chatGateway.broadcastMessage(id, message);
    return message;
  }
}
