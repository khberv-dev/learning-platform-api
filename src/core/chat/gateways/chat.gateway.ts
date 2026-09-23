import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { UserRole } from '@/core/user/enum/user-role.enum';
import { expandFileUrls } from '@/common/utils/file-url.util';

interface AuthedSocket extends Socket {
  data: { userId: string; role: UserRole };
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
    private readonly configService: ConfigService,
  ) {}

  afterInit(namespace: Namespace) {
    namespace.use(async (socket, next) => {
      const token = this.extractToken(socket);
      if (!token) return next(new Error('Token topilmadi'));

      let payload: { sub: string; role: UserRole };
      try {
        payload = await this.jwtService.verifyAsync<{ sub: string; role: UserRole }>(token);
      } catch {
        return next(new Error("Token noto'g'ri"));
      }

      const user = await this.userService.findAuthUser(payload.sub, payload.role);
      if (!user) return next(new Error('Foydalanuvchi topilmadi'));

      socket.data.userId = user.id;
      socket.data.role = user.role;
      next();
    });
  }

  async handleConnection(socket: AuthedSocket) {
    const roomIds = await this.chatService.listRoomIdsForUser({ id: socket.data.userId, role: socket.data.role });
    for (const roomId of roomIds) socket.join(roomKey(roomId));
    this.logger.log(`Connected user=${socket.data.userId} rooms=${roomIds.length}`);
  }

  handleDisconnect(socket: Socket) {
    const userId: string | undefined = (socket as AuthedSocket).data?.userId;
    this.logger.log(`Disconnected user=${userId} socket=${socket.id}`);
  }

  @SubscribeMessage('join')
  async onJoin(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string }) {
    const allowed =
      !!body?.roomId &&
      (await this.chatService.canAccessRoom({ id: socket.data.userId, role: socket.data.role }, body.roomId));
    if (!allowed) {
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

  @SubscribeMessage('send')
  async onSend(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string; text: string }) {
    if (!body?.roomId || !body?.text?.trim()) {
      socket.emit('error', { message: "Xabar matni yoki xona ID yo'q" });
      return;
    }
    try {
      const message = await this.chatService.sendText(
        { id: socket.data.userId, role: socket.data.role },
        body.roomId,
        body.text.trim(),
      );
      this.broadcastMessage(body.roomId, message);
    } catch (err: unknown) {
      socket.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('typing')
  onTyping(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string }) {
    if (!body?.roomId) return;
    socket.to(roomKey(body.roomId)).emit('typing', { userId: socket.data.userId, roomId: body.roomId });
  }

  @SubscribeMessage('stop-typing')
  onStopTyping(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { roomId: string }) {
    if (!body?.roomId) return;
    socket.to(roomKey(body.roomId)).emit('stop-typing', { userId: socket.data.userId, roomId: body.roomId });
  }

  broadcastMessage(roomId: string, message: ChatMessage | null) {
    if (!message) return;
    const expanded = expandFileUrls(message, () => this.configService.getOrThrow<string>('FILES_BASE_URL'));
    this.server.to(roomKey(roomId)).emit('message', expanded);
  }

  private extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (authToken) return authToken;
    const header = socket.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
