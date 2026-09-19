import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { ChatMember } from '@/core/chat/entity/chat-member.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';
import { toChatFilePath } from '@/core/chat/storage/chat-file.storage';
import { type AuthUser, ownerRef, resolveOwnerId } from '@/common/utils/role-owner.util';

type RoleId = Pick<AuthUser, 'id' | 'role'>;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMember) private readonly memberRepo: Repository<ChatMember>,
    @InjectRepository(ChatMessage) private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  private async assertMember(user: RoleId, roomId: string) {
    const member = await this.memberRepo.findOne({
      where: { chatRoom: { id: roomId }, ...ownerRef(user) },
    });
    if (!member) throw new ForbiddenException('Siz bu chatda emassiz');
    return member;
  }

  async listRooms(user: RoleId, query: PaginationQuery): Promise<Paginated<ChatRoom>> {
    const owner = ownerRef(user);
    const ownerColumn = Object.keys(owner)[0];

    const [data, total] = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('member.student', 'memberStudent')
      .leftJoinAndSelect('member.mentor', 'memberMentor')
      .leftJoinAndSelect('member.admin', 'memberAdmin')
      .leftJoinAndSelect('room.assignment', 'assignment')
      .where((qb) => {
        const sub = qb
          .subQuery()
          .select('1')
          .from(ChatMember, 'm')
          .where('m.chat_room_id = room.id')
          .andWhere(`m.${ownerColumn}_id = :ownerId`)
          .getQuery();
        return `EXISTS ${sub}`;
      })
      .setParameter('ownerId', user.id)
      .orderBy('room.updatedAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();
    return paginate(data, total, query);
  }

  async getRoom(user: RoleId, roomId: string) {
    await this.assertMember(user, roomId);
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: {
        assignment: { student: true, mentor: true },
        members: { student: true, mentor: true, admin: true },
      },
    });
    if (!room) throw new NotFoundException('Chat topilmadi');

    const student = room.assignment?.student;
    const mentor = room.assignment?.mentor;

    return {
      id: room.id,
      assignment: room.assignment ? { id: room.assignment.id } : null,
      student: student
        ? { id: student.id, firstName: student.firstName, lastName: student.lastName, avatar: student.avatar }
        : null,
      mentor: mentor
        ? { id: mentor.id, firstName: mentor.firstName, lastName: mentor.lastName, avatar: mentor.avatar }
        : null,
      members: room.members.map((m) => {
        const ownerId = resolveOwnerId(m);
        const owner = m.student ?? m.mentor ?? m.admin;
        return {
          id: m.id,
          user: { id: ownerId, firstName: owner?.firstName, lastName: owner?.lastName, avatar: owner?.avatar },
          joinedAt: m.joinedAt,
        };
      }),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  async listMessages(user: RoleId, roomId: string, query: PaginationQuery): Promise<Paginated<ChatMessage>> {
    await this.assertMember(user, roomId);
    const [data, total] = await this.messageRepo.findAndCount({
      where: { chatRoom: { id: roomId } },
      relations: { student: true, mentor: true, admin: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async sendText(user: RoleId, roomId: string, text: string) {
    await this.assertMember(user, roomId);

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat topilmadi');

    const message = await this.messageRepo.save({
      chatRoom: room,
      ...ownerRef(user),
      type: MessageType.TEXT,
      text,
    });
    await this.roomRepo.update(room.id, { updatedAt: new Date() });
    return this.messageRepo.findOne({
      where: { id: message.id },
      relations: { student: true, mentor: true, admin: true },
    });
  }

  async sendFile(user: RoleId, roomId: string, file: Express.Multer.File) {
    await this.assertMember(user, roomId);

    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Chat topilmadi');

    const message = await this.messageRepo.save({
      chatRoom: room,
      ...ownerRef(user),
      type: MessageType.FILE,
      filePath: toChatFilePath(file.filename),
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
    });
    await this.roomRepo.update(room.id, { updatedAt: new Date() });
    return this.messageRepo.findOne({
      where: { id: message.id },
      relations: { student: true, mentor: true, admin: true },
    });
  }

  async createDirectRoom(studentId: string, mentorId: string, assignmentId: string): Promise<ChatRoom> {
    const assignment = await this.assignmentRepo.findOneOrFail({ where: { id: assignmentId } });
    return this.roomRepo.save({
      assignment,
      members: [{ student: { id: studentId } } as ChatMember, { mentor: { id: mentorId } } as ChatMember],
    });
  }

  async listRoomIdsForUser(user: RoleId): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: ownerRef(user),
      select: { chatRoom: { id: true } },
      relations: { chatRoom: true },
    });
    return members.map((m) => m.chatRoom.id);
  }
}
