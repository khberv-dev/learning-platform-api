import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';

/** Saralash faqat shu ustunlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const PENDING_ENROLLMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'start', 'end', 'status'] as const;
export type PendingEnrollmentSortField = (typeof PENDING_ENROLLMENT_SORT_FIELDS)[number];

export class PendingEnrollmentQuery extends PaginationQuery {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsEnum(PendingEnrollmentStatus)
  @IsOptional()
  status?: PendingEnrollmentStatus;

  @IsIn(PENDING_ENROLLMENT_SORT_FIELDS)
  @IsOptional()
  sortBy: PendingEnrollmentSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
