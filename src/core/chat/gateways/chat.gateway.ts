import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Server, Socket } from 'socket.io';
import { UserService } from '@/core/user/services/user.service';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

const roomKey = (roomId: string) => `room:${roomId}`;

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(namespace: Namespace) {
    namespace.use(async (socket, next) => {
      const token = this.extractToken(socket);
      if (!token) return next(new Error('Token topilmadi'));

      let payload: { sub: string };
      try {
        payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      } catch {
        return next(new Error("Token noto'g'ri"));
      }

      const user = await this.userService.findById(payload.sub);
      if (!user) return next(new Error('Foydalanuvchi topilmadi'));

      socket.data.userId = user.id;
      next();
    });
  }

  async handleConnection(socket: AuthedSocket) {
    const userId = socket.data.userId;
    const roomIds = await this.chatService.listRoomIdsForUser(userId);
    for (const roomId of roomIds) socket.join(roomKey(roomId));
    this.logger.log(`Connected user=${userId} rooms=${roomIds.length}`);
  }

  handleDisconnect(socket: Socket) {
    const userId: string | undefined = socket.data.userId;
    this.logger.log(`Disconnected user=${userId} socket=${socket.id}`);
  }

  @SubscribeMessage('join')
  async onJoin(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string }) {
    const roomIds = await this.chatService.listRoomIdsForUser(socket.data.userId);
    if (!roomIds.includes(body?.roomId)) {
      socket.emit('error', { message: 'Siz bu chatda emassiz' });
      return;
    }
    socket.join(roomKey(body.roomId));
    socket.emit('joined', { roomId: body.roomId });
  }

  @SubscribeMessage('leave')
  onLeave(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string }) {
    if (!body?.roomId) return;
    socket.leave(roomKey(body.roomId));
    socket.emit('left', { roomId: body.roomId });
  }

  broadcastMessage(roomId: string, message: ChatMessage | null) {
    if (!message) return;
    this.server.to(roomKey(roomId)).emit('message', message);
  }

  private extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (authToken) return authToken;
    const header = socket.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
