import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from '@/core/user/services/user.service';
import { MatchService } from '@/core/match/services/match.service';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({ namespace: '/match', cors: { origin: '*' } })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MatchGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly matchService: MatchService,
  ) {}

  async handleConnection(socket: Socket) {
    const token = this.extractToken(socket);
    if (!token) return this.deny(socket, 'Token topilmadi');

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
    } catch {
      return this.deny(socket, "Token noto'g'ri");
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) return this.deny(socket, 'Foydalanuvchi topilmadi');

    socket.data.userId = user.id;
    const replaced = this.matchService.registerSocket(user.id, socket);
    if (replaced) {
      replaced.emit('replaced');
      replaced.disconnect(true);
    }
    this.logger.log(`Connected user=${user.id} socket=${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const userId: string | undefined = socket.data.userId;
    if (!userId) return;
    const ended = this.matchService.endSession(userId);
    if (ended?.partnerSocket) ended.partnerSocket.emit('partner-left', { reason: 'disconnect' });
    this.matchService.unregisterSocket(userId, socket.id);
    this.logger.log(`Disconnected user=${userId} socket=${socket.id}`);
  }

  @SubscribeMessage('search')
  onSearch(@ConnectedSocket() socket: AuthedSocket) {
    const userId = socket.data.userId;
    const result = this.matchService.enqueue(userId);
    if (!result.matched) {
      socket.emit('searching');
      return;
    }

    const otherSocket = this.matchService.getSocket(result.partnerId);
    if (!otherSocket) {
      this.matchService.endSession(userId);
      socket.emit('error', { message: 'Juftlik topilmadi' });
      return;
    }

    socket.emit('matched', { sessionId: result.sessionId, role: 'caller' });
    otherSocket.emit('matched', { sessionId: result.sessionId, role: 'callee' });
  }

  @SubscribeMessage('cancel')
  onCancel(@ConnectedSocket() socket: AuthedSocket) {
    const removed = this.matchService.removeFromQueue(socket.data.userId);
    if (removed) socket.emit('cancelled');
  }

  @SubscribeMessage('signal')
  onSignal(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { data: unknown }) {
    const partner = this.matchService.getPartner(socket.data.userId);
    if (!partner) {
      socket.emit('error', { message: 'Faol sessiya yoʻq' });
      return;
    }
    partner.partnerSocket.emit('signal', { data: body?.data });
  }

  @SubscribeMessage('leave')
  onLeave(@ConnectedSocket() socket: AuthedSocket) {
    const ended = this.matchService.endSession(socket.data.userId);
    if (ended?.partnerSocket) ended.partnerSocket.emit('partner-left', { reason: 'leave' });
    socket.emit('left');
  }

  private extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (authToken) return authToken;
    const header = socket.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }

  private deny(socket: Socket, reason: string) {
    socket.emit('unauthorized', { message: reason });
    socket.disconnect(true);
  }

}
