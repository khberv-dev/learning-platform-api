import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { PendingEnrollmentStatus } from '@/core/enrollment/enum/pending-enrollment-status.enum';

/** Saralash faqat shu ustunlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const PENDING_ENROLLMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'start', 'end', 'status'] as const;
export type PendingEnrollmentSortField = (typeof PENDING_ENROLLMENT_SORT_FIELDS)[number];

export class PendingEnrollmentQuery extends PaginationQuery {
  @ApiPropertyOptional({ example: 'u0000000-0000-0000-0000-000000000001', description: 'Foydalanuvchi (user) id' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional({ enum: PendingEnrollmentStatus, description: 'Berilmasa — barcha holatlar' })
  @IsEnum(PendingEnrollmentStatus)
  @IsOptional()
  status?: PendingEnrollmentStatus;

  @ApiPropertyOptional({ enum: PENDING_ENROLLMENT_SORT_FIELDS, default: 'createdAt' })
  @IsIn(PENDING_ENROLLMENT_SORT_FIELDS)
  @IsOptional()
  sortBy: PendingEnrollmentSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
