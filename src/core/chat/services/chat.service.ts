import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { Student } from '@/core/user/entity/student.entity';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';
import { toChatFilePath } from '@/core/chat/storage/chat-file.storage';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { ownerRef } from '@/common/utils/role-owner.util';

type RoleId = Pick<AuthUser, 'id' | 'role'>;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom) private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  private async hasAccess(user: RoleId, groupId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({ where: { id: user.id }, relations: { group: true } });
      return student?.group?.id === groupId;
    }
    const primary = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: user.id }, role: GroupMentorRole.PRIMARY },
    });
    return !!primary;
  }

  private async loadRoomWithGroup(roomId: string): Promise<ChatRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: { group: true } });
    if (!room) throw new NotFoundException('Chat topilmadi');
    return room;
  }

  private async assertAccess(user: RoleId, roomId: string): Promise<ChatRoom> {
    const room = await this.loadRoomWithGroup(roomId);
    if (!(await this.hasAccess(user, room.group.id))) throw new ForbiddenException('Siz bu chatda emassiz');
    return room;
  }

  async listRooms(user: RoleId, query: PaginationQuery): Promise<Paginated<ChatRoom>> {
    const qb = this.roomRepo.createQueryBuilder('room').leftJoinAndSelect('room.group', 'group');

    if (user.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({ where: { id: user.id }, relations: { group: true } });
      qb.andWhere('room.group_id = :groupId', { groupId: student?.group?.id ?? null });
    } else if (user.role === UserRole.MENTOR) {
      qb.andWhere((sub) => {
        const exists = sub
          .subQuery()
          .select('1')
          .from(GroupMentor, 'gm')
          .where('gm.group_id = room.group_id')
          .andWhere('gm.mentor_id = :mentorId')
          .andWhere('gm.role = :role')
          .getQuery();
        return `EXISTS ${exists}`;
      })
        .setParameter('mentorId', user.id)
        .setParameter('role', GroupMentorRole.PRIMARY);
    }

    const [data, total] = await qb
      .orderBy('room.updatedAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();
    return paginate(data, total, query);
  }

  async getRoom(user: RoleId, roomId: string) {
    const room = await this.assertAccess(user, roomId);
    const [primary, students] = await Promise.all([
      this.groupMentorRepo.findOne({
        where: { group: { id: room.group.id }, role: GroupMentorRole.PRIMARY },
        relations: { mentor: true },
      }),
      this.studentRepo.find({ where: { group: { id: room.group.id } } }),
    ]);

    return {
      id: room.id,
      group: { id: room.group.id, title: room.group.title },
      mentor: primary?.mentor
        ? {
            id: primary.mentor.id,
            firstName: primary.mentor.firstName,
            lastName: primary.mentor.lastName,
            avatar: primary.mentor.avatar,
          }
        : null,
      students: students.map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, avatar: s.avatar })),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  async listMessages(user: RoleId, roomId: string, query: PaginationQuery): Promise<Paginated<ChatMessage>> {
    await this.assertAccess(user, roomId);
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
    const room = await this.assertAccess(user, roomId);

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
    const room = await this.assertAccess(user, roomId);

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

  async canAccessRoom(user: RoleId, roomId: string): Promise<boolean> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: { group: true } });
    if (!room) return false;
    return this.hasAccess(user, room.group.id);
  }

  async createRoomForGroup(group: Group): Promise<ChatRoom> {
    return this.roomRepo.save({ group });
  }

  async listRoomIdsForUser(user: RoleId): Promise<string[]> {
    if (user.role === UserRole.ADMIN) {
      const rooms = await this.roomRepo.find({ select: { id: true } });
      return rooms.map((r) => r.id);
    }
    if (user.role === UserRole.STUDENT) {
      const student = await this.studentRepo.findOne({ where: { id: user.id }, relations: { group: true } });
      if (!student?.group) return [];
      const room = await this.roomRepo.findOne({ where: { group: { id: student.group.id } } });
      return room ? [room.id] : [];
    }
    const memberships = await this.groupMentorRepo.find({
      where: { mentor: { id: user.id }, role: GroupMentorRole.PRIMARY },
      relations: { group: true },
    });
    if (memberships.length === 0) return [];
    const rooms = await this.roomRepo.find({ where: memberships.map((m) => ({ group: { id: m.group.id } })) });
    return rooms.map((r) => r.id);
  }
}
