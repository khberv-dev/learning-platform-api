import { IsNull, Repository } from 'typeorm';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';

export async function activeGroupIdsOfStudent(
  membershipRepo: Repository<GroupMembership>,
  studentId: string,
): Promise<string[]> {
  const memberships = await membershipRepo.find({
    where: { student: { id: studentId }, leftAt: IsNull() },
    relations: { group: true },
  });
  return memberships.map((membership) => membership.group.id);
}

export function isActiveGroupMember(
  membershipRepo: Repository<GroupMembership>,
  studentId: string,
  groupId: string,
): Promise<boolean> {
  return membershipRepo.exists({ where: { student: { id: studentId }, group: { id: groupId }, leftAt: IsNull() } });
}
