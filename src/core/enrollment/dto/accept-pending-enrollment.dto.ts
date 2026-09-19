import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AcceptPendingEnrollmentDto {
  @IsUUID()
  planId: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;
}
