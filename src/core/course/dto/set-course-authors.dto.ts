import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetCourseAuthorsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  authorIds: string[];
}
