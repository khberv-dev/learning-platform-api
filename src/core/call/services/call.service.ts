import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from '@/core/call/entity/call.entity';
import { UserRole } from '@/core/user/enum/user-role.enum';

type RolePeer = { id: string; role: UserRole };

function peerColumns(prefix: 'peerA' | 'peerB', peer: RolePeer): Record<string, { id: string }> {
  const column =
    peer.role === UserRole.STUDENT
      ? `${prefix}Student`
      : peer.role === UserRole.MENTOR
        ? `${prefix}Mentor`
        : `${prefix}Admin`;
  return { [column]: { id: peer.id } };
}

@Injectable()
export class CallService {
  constructor(@InjectRepository(Call) private readonly callRepo: Repository<Call>) {}

  async start(peerA: RolePeer, peerB: RolePeer): Promise<string> {
    const call = await this.callRepo.save({
      ...peerColumns('peerA', peerA),
      ...peerColumns('peerB', peerB),
      startDate: new Date(),
    });
    return call.id;
  }

  async end(callId: string): Promise<void> {
    const call = await this.callRepo.findOne({ where: { id: callId } });
    if (!call || call.endDate) return;
    const endDate = new Date();
    const durationSeconds = Math.max(0, Math.floor((endDate.getTime() - call.startDate.getTime()) / 1000));
    await this.callRepo.update(callId, { endDate, durationSeconds });
  }
}
