import { IsUUID } from 'class-validator';

export class SwapGroupStudentDto {
  @IsUUID()
  toGroupId: string;
}
