import { ArrayNotEmpty, IsUUID } from 'class-validator';

export class AddGroupStudentsDto {
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  studentIds: string[];
}
