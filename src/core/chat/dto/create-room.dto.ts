import { ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  memberIds: string[];
}
