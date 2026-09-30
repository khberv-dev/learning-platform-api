import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID()
  courseId: string;

  @IsObject()
  @IsOptional()
  schedule?: Record<string, string[]>;
}
