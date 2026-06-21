import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  teacherId: string;

  @ApiProperty({ example: '2026-05-10T09:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    example: { Mon: ['10:00'], Wed: ['14:00', '14:30'] },
    description: "Mentorning jadvalidagi tanlangan vaqtlar. Haftada maksimal 3 ta slot.",
  })
  @IsObject()
  @IsOptional()
  selectedSchedule?: Record<string, string[]>;
}
