import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { User } from '@/core/user/entity/user.entity';
import { CreateSessionDto } from '@/core/session/dto/create-session.dto';

/** Javobda foydalanuvchining faqat identifikatori qaytadi. */
const sessionSelect: FindOptionsSelect<Session> = {
  id: true,
  os: true,
  fcmToken: true,
  createdAt: true,
  updatedAt: true,
  user: { id: true },
};

@Injectable()
export class SessionService {
  constructor(@InjectRepository(Session) private readonly sessionRepo: Repository<Session>) {}

  /**
   * Sessiyani yaratadi. Qurilma qayta ro'yxatdan o'tsa (masalan boshqa foydalanuvchi kirsa),
   * o'sha FCM token bo'yicha mavjud sessiya yangilanadi — dublikat qatorlar to'planmaydi.
   */
  async createSession(userId: string, dto: CreateSessionDto): Promise<Session> {
    await this.sessionRepo.upsert(
      { ...dto, user: { id: userId } as User, updatedAt: new Date() },
      { conflictPaths: ['fcmToken'] },
    );
    return this.sessionRepo.findOneOrFail({
      where: { fcmToken: dto.fcmToken },
      relations: { user: true },
      select: sessionSelect,
    });
  }

  async findOneSession(userId: string, id: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id, user: { id: userId } },
      relations: { user: true },
      select: sessionSelect,
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    return session;
  }

  /** Foydalanuvchining barcha qurilmalaridagi FCM tokenlari — push yuborish uchun. */
  async listUserTokens(userId: string): Promise<string[]> {
    const sessions = await this.sessionRepo.find({ where: { user: { id: userId } }, select: { fcmToken: true } });
    return sessions.map((session) => session.fcmToken);
  }
}
