import { IsUUID } from 'class-validator';

export class AssignPrimaryMentorDto {
  @IsUUID()
  mentorId: string;
}
