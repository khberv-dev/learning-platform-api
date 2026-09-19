import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';
import { type AuthUser, ownerRef } from '@/common/utils/role-owner.util';

type RoleId = Pick<AuthUser, 'id' | 'role'>;

const sessionSelect: FindOptionsSelect<Session> = {
  id: true,
  os: true,
  fcmToken: true,
  createdAt: true,
  updatedAt: true,
  student: { id: true },
  mentor: { id: true },
  admin: { id: true },
};

@Injectable()
export class SessionService {
  constructor(@InjectRepository(Session) private readonly sessionRepo: Repository<Session>) {}

  async createSession(user: RoleId, dto: CreateSessionDto): Promise<Session> {
    await this.sessionRepo.upsert(
      { ...dto, ...ownerRef(user), updatedAt: new Date() },
      { conflictPaths: ['fcmToken'] },
    );
    return this.sessionRepo.findOneOrFail({
      where: { fcmToken: dto.fcmToken },
      select: sessionSelect,
    });
  }

  async findOneSession(user: RoleId, id: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id, ...ownerRef(user) },
      select: sessionSelect,
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    return session;
  }

  async deleteSession(user: RoleId, id: string): Promise<void> {
    const session = await this.findOneSession(user, id);
    await this.sessionRepo.remove(session);
  }
}
