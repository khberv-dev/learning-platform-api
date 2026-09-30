import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { activeGroupIdsOfStudent, isActiveGroupMember } from '@/core/group/utils/group-membership.util';
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
    @InjectRepository(GroupMembership) private readonly membershipRepo: Repository<GroupMembership>,
  ) {}

  private async hasAccess(user: RoleId, groupId: string): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.STUDENT) return isActiveGroupMember(this.membershipRepo, user.id, groupId);
    return this.groupRepo.exists({ where: { id: groupId, primaryMentor: { id: user.id } } });
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
      qb.andWhere((sub) => {
        const exists = sub
          .subQuery()
          .select('1')
          .from(GroupMembership, 'membership')
          .where('membership.group_id = room.group_id')
          .andWhere('membership.student_id = :studentId')
          .andWhere('membership.left_at IS NULL')
          .getQuery();
        return `EXISTS ${exists}`;
      }).setParameter('studentId', user.id);
    } else if (user.role === UserRole.MENTOR) {
      qb.andWhere('group.primary_mentor_id = :mentorId', { mentorId: user.id });
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
    const [group, memberships] = await Promise.all([
      this.groupRepo.findOne({ where: { id: room.group.id }, relations: { primaryMentor: true } }),
      this.membershipRepo.find({
        where: { group: { id: room.group.id }, leftAt: IsNull() },
        relations: { student: true },
      }),
    ]);
    const mentor = group?.primaryMentor ?? null;
    const students = memberships.map((m) => m.student);

    return {
      id: room.id,
      group: { id: room.group.id, title: room.group.title },
      mentor: mentor
        ? { id: mentor.id, firstName: mentor.firstName, lastName: mentor.lastName, avatar: mentor.avatar }
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
    const groupIds =
      user.role === UserRole.STUDENT
        ? await activeGroupIdsOfStudent(this.membershipRepo, user.id)
        : (await this.groupRepo.find({ where: { primaryMentor: { id: user.id } }, select: { id: true } })).map(
            (group) => group.id,
          );
    if (groupIds.length === 0) return [];
    const rooms = await this.roomRepo.find({ where: { group: { id: In(groupIds) } }, select: { id: true } });
    return rooms.map((r) => r.id);
  }
}
