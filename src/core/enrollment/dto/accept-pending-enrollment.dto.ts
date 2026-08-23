import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/** Admin so'rovni tasdiqlaydi va tarifni tanlaydi — narx va muddat shundan olinadi. */
export class AcceptPendingEnrollmentDto {
  @IsUUID()
  planId: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;
}
