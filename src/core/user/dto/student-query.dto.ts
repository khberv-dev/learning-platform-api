import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { StudentLevel } from '@/core/user/enum/student-level.enum';

export const STUDENT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'points',
  'coins',
  'level',
  'firstName',
  'lastName',
] as const;
export type StudentSortField = (typeof STUDENT_SORT_FIELDS)[number];

export const STUDENT_SORT_COLUMN: Record<StudentSortField, string> = {
  createdAt: 'student.createdAt',
  updatedAt: 'student.updatedAt',
  points: 'student.points',
  coins: 'student.coins',
  level: 'student.level',
  firstName: 'student.firstName',
  lastName: 'student.lastName',
};

export class StudentQuery extends PaginationQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  hasCourse?: boolean;

  @IsIn(STUDENT_SORT_FIELDS)
  @IsOptional()
  sortBy: StudentSortField = 'createdAt';

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
