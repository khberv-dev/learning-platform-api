import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';

export const MENTOR_SORT_FIELDS = ['createdAt', 'updatedAt', 'status', 'role', 'firstName', 'lastName'] as const;
export type MentorSortField = (typeof MENTOR_SORT_FIELDS)[number];

export const MENTOR_SORT_COLUMN: Record<MentorSortField, string> = {
  createdAt: 'mentor.createdAt',
  updatedAt: 'mentor.updatedAt',
  status: 'mentor.status',
  role: 'mentor.role',
  firstName: 'mentor.firstName',
  lastName: 'mentor.lastName',
};

export class MentorQuery extends PaginationQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(MentorStatus)
  @IsOptional()
  status?: MentorStatus;

  @IsEnum(GroupMentorRole)
  @IsOptional()
  role?: GroupMentorRole;

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsIn(MENTOR_SORT_FIELDS)
  @IsOptional()
  sortBy: MentorSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
