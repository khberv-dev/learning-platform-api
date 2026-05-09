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
import { MatchService } from '@/core/match/services/match.service';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({ namespace: '/match', cors: { origin: '*' } })
export class MatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MatchGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly matchService: MatchService,
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

  handleConnection(socket: AuthedSocket) {
    const userId = socket.data.userId;
    const replaced = this.matchService.registerSocket(userId, socket);
    if (replaced) {
      replaced.emit('replaced');
      replaced.disconnect(true);
    }
    this.logger.log(`Connected user=${userId} socket=${socket.id}`);
  }

  async handleDisconnect(socket: Socket) {
    const userId: string | undefined = socket.data.userId;
    if (!userId) return;
    const ended = await this.matchService.end(userId, 'disconnect');
    if (ended?.partnerSocket) ended.partnerSocket.emit('partner-left', { reason: 'disconnect' });
    this.matchService.unregisterSocket(userId, socket.id);
    this.logger.log(`Disconnected user=${userId} socket=${socket.id}`);
  }

  @SubscribeMessage('search')
  async onSearch(@ConnectedSocket() socket: AuthedSocket) {
    const outcome = await this.matchService.search(socket.data.userId);

    if (outcome.endedPartner?.partnerSocket) {
      outcome.endedPartner.partnerSocket.emit('partner-left', { reason: 'leave' });
    }

    switch (outcome.result.kind) {
      case 'created':
      case 'already-waiting':
        socket.emit('searching');
        return;
      case 'joined': {
        const partnerSocket = this.matchService.getSocket(outcome.result.partnerId);
        if (!partnerSocket) {
          await this.matchService.end(socket.data.userId, 'leave');
          socket.emit('error', { message: 'Juftlik topilmadi' });
          return;
        }
        socket.emit('matched', { sessionId: outcome.result.sessionId, role: 'caller' });
        partnerSocket.emit('matched', { sessionId: outcome.result.sessionId, role: 'callee' });
        return;
      }
    }
  }

  @SubscribeMessage('cancel')
  async onCancel(@ConnectedSocket() socket: AuthedSocket) {
    const cancelled = await this.matchService.cancel(socket.data.userId);
    if (cancelled) socket.emit('cancelled');
  }

  @SubscribeMessage('signal')
  onSignal(@ConnectedSocket() socket: AuthedSocket, @MessageBody() body: { data: unknown }) {
    const partner = this.matchService.getPartner(socket.data.userId);
    if (!partner) {
      socket.emit('error', { message: 'Faol sessiya yoʻq' });
      return;
    }
    const type = (body?.data as { type?: string } | undefined)?.type ?? 'unknown';
    this.logger.log(`Session ${partner.sessionId} signal type=${type}: ${socket.data.userId} -> ${partner.partnerId}`);
    partner.partnerSocket.emit('signal', { data: body?.data });
  }

  @SubscribeMessage('leave')
  async onLeave(@ConnectedSocket() socket: AuthedSocket) {
    const ended = await this.matchService.end(socket.data.userId, 'leave');
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
}
