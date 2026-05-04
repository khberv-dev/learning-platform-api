import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import { CallService } from '@/core/call/services/call.service';

type SessionState = 'waiting' | 'active';

interface Session {
  id: string;
  peers: string[];
  state: SessionState;
  callId?: string;
}

export type SearchResult =
  | { kind: 'created'; sessionId: string }
  | { kind: 'joined'; sessionId: string; partnerId: string }
  | { kind: 'already-waiting'; sessionId: string };

export type CloseReason = 'cancel' | 'leave' | 'disconnect' | 'replaced';

export interface SearchOutcome {
  result: SearchResult;
  endedPartner?: EndedSession;
}

interface EndedSession {
  sessionId: string;
  partnerId: string | null;
  partnerSocket: Socket | null;
}

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private readonly socketByUser = new Map<string, Socket>();
  private readonly sessions = new Map<string, Session>();
  private readonly sessionByUser = new Map<string, string>();
  private readonly waitingSessionIds: string[] = [];

  constructor(private readonly callService: CallService) {}

  registerSocket(userId: string, socket: Socket): Socket | null {
    const existing = this.socketByUser.get(userId);
    this.socketByUser.set(userId, socket);
    return existing && existing.id !== socket.id ? existing : null;
  }

  unregisterSocket(userId: string, socketId: string) {
    const current = this.socketByUser.get(userId);
    if (current && current.id === socketId) this.socketByUser.delete(userId);
  }

  getSocket(userId: string): Socket | null {
    return this.socketByUser.get(userId) ?? null;
  }

  getPartner(userId: string): { partnerId: string; partnerSocket: Socket; sessionId: string } | null {
    const sessionId = this.sessionByUser.get(userId);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return null;
    const partnerId = session.peers.find((p) => p !== userId);
    if (!partnerId) return null;
    const partnerSocket = this.socketByUser.get(partnerId);
    if (!partnerSocket) return null;
    return { partnerId, partnerSocket, sessionId };
  }

  async search(userId: string): Promise<SearchOutcome> {
    let endedPartner: EndedSession | undefined;
    const currentSessionId = this.sessionByUser.get(userId);
    if (currentSessionId) {
      const current = this.sessions.get(currentSessionId);
      if (current?.state === 'waiting') {
        return { result: { kind: 'already-waiting', sessionId: current.id } };
      }
      if (current?.state === 'active') {
        endedPartner = (await this.dropSession(userId, 'replaced')) ?? undefined;
      }
    }

    const joinable = this.popJoinableSession(userId);
    if (joinable) {
      joinable.peers.push(userId);
      joinable.state = 'active';
      this.sessionByUser.set(userId, joinable.id);
      const partnerId = joinable.peers[0];
      joinable.callId = await this.callService.start(partnerId, userId);
      this.logger.log(
        `Session ${joinable.id} member added: ${userId} (caller) joined; active peers=[${joinable.peers.join(', ')}]; callId=${joinable.callId}`,
      );
      return {
        result: { kind: 'joined', sessionId: joinable.id, partnerId },
        endedPartner,
      };
    }

    const session: Session = { id: randomUUID(), peers: [userId], state: 'waiting' };
    this.sessions.set(session.id, session);
    this.sessionByUser.set(userId, session.id);
    this.waitingSessionIds.push(session.id);
    this.logger.log(`Session ${session.id} created (waiting) by ${userId}`);
    return { result: { kind: 'created', sessionId: session.id }, endedPartner };
  }

  async cancel(userId: string): Promise<boolean> {
    const sessionId = this.sessionByUser.get(userId);
    if (!sessionId) return false;
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'waiting') return false;
    await this.dropSession(userId, 'cancel');
    return true;
  }

  end(userId: string, reason: 'leave' | 'disconnect'): Promise<EndedSession | null> {
    return this.dropSession(userId, reason);
  }

  private async dropSession(userId: string, reason: CloseReason): Promise<EndedSession | null> {
    const sessionId = this.sessionByUser.get(userId);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.sessionByUser.delete(userId);

    if (!session || session.state === 'waiting') {
      if (session) this.removeWaiting(sessionId);
      this.logger.log(`Session ${sessionId} closed (reason=${reason}, by ${userId}, partner=none)`);
      return { sessionId, partnerId: null, partnerSocket: null };
    }

    const partnerId = session.peers.find((p) => p !== userId) ?? null;
    if (partnerId) this.sessionByUser.delete(partnerId);
    if (session.callId) await this.callService.end(session.callId);
    this.logger.log(
      `Session ${sessionId} closed (reason=${reason}, by ${userId}, partner=${partnerId ?? 'none'}, callId=${session.callId ?? 'none'})`,
    );
    return { sessionId, partnerId, partnerSocket: partnerId ? (this.socketByUser.get(partnerId) ?? null) : null };
  }

  private popJoinableSession(excludeUserId: string): Session | null {
    while (this.waitingSessionIds.length > 0) {
      const id = this.waitingSessionIds.shift()!;
      const session = this.sessions.get(id);
      if (!session || session.state !== 'waiting') continue;
      const peer = session.peers[0];
      if (!peer || peer === excludeUserId) continue;
      if (!this.socketByUser.has(peer)) {
        this.sessions.delete(id);
        this.sessionByUser.delete(peer);
        continue;
      }
      return session;
    }
    return null;
  }

  private removeWaiting(sessionId: string) {
    const idx = this.waitingSessionIds.indexOf(sessionId);
    if (idx !== -1) this.waitingSessionIds.splice(idx, 1);
  }
}
