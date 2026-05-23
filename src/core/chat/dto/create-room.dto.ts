import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoomDto {
  @ApiPropertyOptional({ example: 'IELTS Speaking Club' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: ['11111111-2222-3333-4444-555555555555', '66666666-7777-8888-9999-000000000000'],
    description: 'User IDs (the creator is added automatically)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  memberIds: string[];
}
