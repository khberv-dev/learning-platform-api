import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from '@/core/call/entity/call.entity';
import { User } from '@/core/user/entity/user.entity';

@Injectable()
export class CallService {
  constructor(@InjectRepository(Call) private readonly callRepo: Repository<Call>) {}

  async start(peerAId: string, peerBId: string): Promise<string> {
    const call = await this.callRepo.save({
      peerA: { id: peerAId } as User,
      peerB: { id: peerBId } as User,
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
