import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatGateway } from '@/core/chat/gateways/chat.gateway';
import { SendMessageDto } from '@/core/chat/dto/send-message.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { CHAT_FILE_MAX_BYTES, chatFileStorage } from '@/core/chat/storage/chat-file.storage';

const roomExample = {
  id: 'cr000000-0000-0000-0000-000000000001',
  name: 'IELTS Speaking Club',
  isGroup: true,
  members: [
    {
      id: 'cm000000-0000-0000-0000-000000000001',
      user: { id: '11111111-2222-3333-4444-555555555555', firstName: 'Sevara', lastName: 'Karimova' },
      joinedAt: '2026-05-19T10:00:00.000Z',
    },
  ],
  createdAt: '2026-05-19T10:00:00.000Z',
  updatedAt: '2026-05-19T10:00:00.000Z',
};

const messageExample = {
  id: 'cm000000-0000-0000-0000-0000000000aa',
  type: 'text',
  text: 'Hello, how are you?',
  filePath: null,
  fileName: null,
  fileSize: null,
  fileMimeType: null,
  sender: { id: '11111111-2222-3333-4444-555555555555', firstName: 'Sevara' },
  createdAt: '2026-05-19T10:05:00.000Z',
};

const fileMessageExample = {
  ...messageExample,
  type: 'file',
  text: null,
  filePath: '/chat/8a9bff2e.pdf',
  fileName: 'syllabus.pdf',
  fileSize: 1048576,
  fileMimeType: 'application/pdf',
};

const roomListExample = {
  data: [roomExample],
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const messageListExample = {
  data: [messageExample],
  total: 42,
  page: 1,
  limit: 10,
  totalPages: 5,
};

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms')
  @ApiOkResponse({ schema: { example: roomListExample } })
  listRooms(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.chatService.listRooms(user.id, query);
  }

  @Get('rooms/:id')
  @ApiOkResponse({ schema: { example: roomExample } })
  getRoom(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.chatService.getRoom(user.id, id);
  }

  @Get('rooms/:id/messages')
  @ApiOkResponse({ schema: { example: messageListExample } })
  listMessages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query() query: PaginationQuery,
  ) {
    return this.chatService.listMessages(user.id, id, query);
  }

  @Post('rooms/:id/messages')
  @ApiCreatedResponse({ schema: { example: messageExample } })
  async sendText(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendText(user.id, id, dto.text);
    this.chatGateway.broadcastMessage(id, message);
    return message;
  }

  @Post('rooms/:id/messages/file')
  @UseInterceptors(FileInterceptor('file', { storage: chatFileStorage, limits: { fileSize: CHAT_FILE_MAX_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiCreatedResponse({ schema: { example: fileMessageExample } })
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
