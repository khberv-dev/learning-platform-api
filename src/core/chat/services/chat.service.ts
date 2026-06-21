import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { ChatMember } from '@/core/chat/entity/chat-member.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';
import { User } from '@/core/user/entity/user.entity';
import { CreateRoomDto } from '@/core/chat/dto/create-room.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';
import { toChatFilePath } from '@/core/chat/storage/chat-file.storage';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMember) private readonly memberRepo: Repository<ChatMember>,
    @InjectRepository(ChatMessage) private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async assertMember(userId: string, roomId: string) {
    const member = await this.memberRepo.findOne({
      where: { chatRoom: { id: roomId }, user: { id: userId } },
    });
    if (!member) throw new ForbiddenException('Siz bu chatda emassiz');
    return member;
  }

  async createRoom(creatorUserId: string, dto: CreateRoomDto) {
    const memberIds = Array.from(new Set([creatorUserId, ...dto.memberIds]));
    if (memberIds.length < 2) throw new BadRequestException('Kamida bitta boshqa foydalanuvchi kerak');

    const users = await this.userRepo.find({ where: { id: In(memberIds) } });
    if (users.length !== memberIds.length) throw new NotFoundException('Bazi foydalanuvchilar topilmadi');

    return this.roomRepo.save({
      name: dto.name,
      isGroup: memberIds.length > 2,
      members: users.map((u) => ({ user: u }) as ChatMember),
    });
  }

  async listRooms(userId: string, query: PaginationQuery): Promise<Paginated<ChatRoom>> {
    const [data, total] = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where((qb) => {
        const sub = qb
          .subQuery()
          .select('1')
          .from(ChatMember, 'm')
          .where('m.chat_room_id = room.id')
          .andWhere('m.user_id = :userId')
          .getQuery();
        return `EXISTS ${sub}`;
      })
      .setParameter('userId', userId)
      .orderBy('room.updatedAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();
    return paginate(data, total, query);
  }

  async getRoom(userId: string, roomId: string) {
    await this.assertMember(userId, roomId);
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: { members: { user: true } },
    });
    if (!room) throw new NotFoundException('Chat topilmadi');
    return room;
  }

  async listMessages(userId: string, roomId: string, query: PaginationQuery): Promise<Paginated<ChatMessage>> {
    await this.assertMember(userId, roomId);
    const [data, total] = await this.messageRepo.findAndCount({
      where: { chatRoom: { id: roomId } },
      relations: { sender: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async sendText(userId: string, roomId: string, text: string) {
    await this.assertMember(userId, roomId);
    const sender = await this.userRepo.findOne({ where: { id: userId } });
    if (!sender) throw new NotFoundException('Foydalanuvchi topilmadi');

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat topilmadi');

    const message = await this.messageRepo.save({
      chatRoom: room,
      sender,
      type: MessageType.TEXT,
      text,
    });
    await this.roomRepo.update(room.id, { updatedAt: new Date() });
    return this.messageRepo.findOne({ where: { id: message.id }, relations: { sender: true } });
  }

  async sendFile(userId: string, roomId: string, file: Express.Multer.File) {
    await this.assertMember(userId, roomId);
    const sender = await this.userRepo.findOne({ where: { id: userId } });
    if (!sender) throw new NotFoundException('Foydalanuvchi topilmadi');

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat topilmadi');

    const message = await this.messageRepo.save({
      chatRoom: room,
      sender,
      type: MessageType.FILE,
      filePath: toChatFilePath(file.filename),
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
    });
    await this.roomRepo.update(room.id, { updatedAt: new Date() });
    return this.messageRepo.findOne({ where: { id: message.id }, relations: { sender: true } });
  }

  async createDirectRoom(userIdA: string, userIdB: string): Promise<ChatRoom> {
    const users = await this.userRepo.find({ where: { id: In([userIdA, userIdB]) } });
    return this.roomRepo.save({
      isGroup: false,
      members: users.map((u) => ({ user: u }) as ChatMember),
    });
  }

  async listRoomIdsForUser(userId: string): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: { user: { id: userId } },
      select: { chatRoom: { id: true } },
      relations: { chatRoom: true },
    });
    return members.map((m) => m.chatRoom.id);
  }
}
