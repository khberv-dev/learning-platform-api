import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsObject()
  @IsOptional()
  schedule?: Record<string, string[]>;
}
