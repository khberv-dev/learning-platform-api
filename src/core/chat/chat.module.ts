import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { ChatMember } from '@/core/chat/entity/chat-member.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { User } from '@/core/user/entity/user.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { UserModule } from '@/core/user/user.module';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatController } from '@/core/chat/controllers/chat.controller';
import { ChatGateway } from '@/core/chat/gateways/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMember, ChatMessage, User, Assignment]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
      }),
    }),
    UserModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
