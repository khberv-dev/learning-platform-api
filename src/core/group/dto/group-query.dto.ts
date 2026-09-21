import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

export const GROUP_SORT_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;
export type GroupSortField = (typeof GROUP_SORT_FIELDS)[number];

export const GROUP_SORT_COLUMN: Record<GroupSortField, string> = {
  createdAt: 'group.createdAt',
  updatedAt: 'group.updatedAt',
  title: 'group.title',
};

export class GroupQuery extends PaginationQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsIn(GROUP_SORT_FIELDS)
  @IsOptional()
  sortBy: GroupSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
