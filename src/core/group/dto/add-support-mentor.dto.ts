import { IsUUID } from 'class-validator';

export class AddSupportMentorDto {
  @IsUUID()
  mentorId: string;
}
