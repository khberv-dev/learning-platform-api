import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';

/** Saralash faqat shu ustunlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const ENROLLMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'start', 'end', 'status'] as const;
export type EnrollmentSortField = (typeof ENROLLMENT_SORT_FIELDS)[number];

export class EnrollmentQuery extends PaginationQuery {
  @ApiPropertyOptional({ example: 'st000000-0000-0000-0000-000000000001', description: 'Talaba (student) id' })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description:
      "Muddati bo'yicha filtr. `true` — muddati tugagan, `false` — amaldagi. " +
      "Faqat `active` yozilishlarga taalluqli: `created` va `cancelled` da muddat bo'lmaydi.",
  })
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isExpired?: boolean;

  @ApiPropertyOptional({ enum: ENROLLMENT_SORT_FIELDS, default: 'createdAt' })
  @IsIn(ENROLLMENT_SORT_FIELDS)
  @IsOptional()
  sortBy: EnrollmentSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
