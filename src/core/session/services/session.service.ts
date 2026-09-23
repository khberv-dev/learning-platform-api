import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';

const sessionSelect: FindOptionsSelect<Session> = {
  id: true,
  os: true,
  fcmToken: true,
  createdAt: true,
  updatedAt: true,
  student: { id: true },
};

@Injectable()
export class SessionService {
  constructor(@InjectRepository(Session) private readonly sessionRepo: Repository<Session>) {}

  async createSession(studentId: string, dto: CreateSessionDto): Promise<Session> {
    await this.sessionRepo.upsert(
      { ...dto, student: { id: studentId }, updatedAt: new Date() },
      { conflictPaths: ['fcmToken'] },
    );
    return this.sessionRepo.findOneOrFail({
      where: { fcmToken: dto.fcmToken },
      select: sessionSelect,
    });
  }

  async findOneSession(studentId: string, id: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id, student: { id: studentId } },
      select: sessionSelect,
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    return session;
  }

  async deleteSession(studentId: string, id: string): Promise<void> {
    const session = await this.findOneSession(studentId, id);
    await this.sessionRepo.remove(session);
  }
}
