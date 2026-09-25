import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

export const ENROLLMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'start', 'status'] as const;
export type EnrollmentSortField = (typeof ENROLLMENT_SORT_FIELDS)[number];

export class EnrollmentQuery extends PaginationQuery {
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @IsIn(ENROLLMENT_SORT_FIELDS)
  @IsOptional()
  sortBy: EnrollmentSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
