import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

/** Saralash faqat shu ustunlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const ENROLLMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'start', 'end', 'status'] as const;
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

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isExpired?: boolean;

  @IsIn(ENROLLMENT_SORT_FIELDS)
  @IsOptional()
  sortBy: EnrollmentSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
