import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';

export class AssignmentQuery extends PaginationQuery {
  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsUUID()
  @IsOptional()
  mentorId?: string;
}
