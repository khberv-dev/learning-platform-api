import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';

type PeerRole = 'caller' | 'callee';
interface Session {
  id: string;
  peers: [string, string];
}

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private readonly queue: string[] = [];
  private readonly socketByUser = new Map<string, Socket>();
  private readonly sessionByUser = new Map<string, string>();
  private readonly sessions = new Map<string, Session>();

  registerSocket(userId: string, socket: Socket): Socket | null {
    const existing = this.socketByUser.get(userId);
    this.socketByUser.set(userId, socket);
    return existing && existing.id !== socket.id ? existing : null;
  }

  unregisterSocket(userId: string, socketId: string) {
    const current = this.socketByUser.get(userId);
    if (current && current.id === socketId) this.socketByUser.delete(userId);
    this.removeFromQueue(userId);
  }

  getSocket(userId: string): Socket | null {
    return this.socketByUser.get(userId) ?? null;
  }

  getPartner(userId: string): { partnerId: string; partnerSocket: Socket; sessionId: string } | null {
    const sessionId = this.sessionByUser.get(userId);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const partnerId = session.peers[0] === userId ? session.peers[1] : session.peers[0];
    const partnerSocket = this.socketByUser.get(partnerId);
    if (!partnerSocket) return null;
    return { partnerId, partnerSocket, sessionId };
  }

  enqueue(userId: string): { matched: false } | { matched: true; sessionId: string; role: PeerRole; partnerId: string } {
    if (this.sessionByUser.has(userId)) {
      this.endSession(userId);
    }
    if (this.queue.includes(userId)) return { matched: false };

    const waitingId = this.popNextWaiting(userId);
    if (!waitingId) {
      this.queue.push(userId);
      this.logger.log(`User ${userId} added to queue (size=${this.queue.length})`);
      return { matched: false };
    }

    const session: Session = { id: randomUUID(), peers: [waitingId, userId] };
    this.sessions.set(session.id, session);
    this.sessionByUser.set(waitingId, session.id);
    this.sessionByUser.set(userId, session.id);
    this.logger.log(`Matched ${waitingId} (callee) with ${userId} (caller) in session ${session.id}`);

    return { matched: true, sessionId: session.id, role: 'caller', partnerId: waitingId };
  }

  removeFromQueue(userId: string): boolean {
    const idx = this.queue.indexOf(userId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  endSession(userId: string): { partnerId: string; partnerSocket: Socket | null; sessionId: string } | null {
    const sessionId = this.sessionByUser.get(userId);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.sessionByUser.delete(userId);
    if (!session) return null;
    const partnerId = session.peers[0] === userId ? session.peers[1] : session.peers[0];
    this.sessionByUser.delete(partnerId);
    return { partnerId, partnerSocket: this.socketByUser.get(partnerId) ?? null, sessionId };
  }

  private popNextWaiting(excludeUserId: string): string | null {
    while (this.queue.length > 0) {
      const candidate = this.queue.shift()!;
      if (candidate === excludeUserId) continue;
      if (!this.socketByUser.has(candidate)) continue;
      return candidate;
    }
    return null;
  }
}
