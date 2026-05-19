import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'f2c8a0e0-1111-2222-3333-444455556666' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  courseId: string;

  @ApiProperty({ example: '2026-05-18T00:00:00.000Z' })
  @IsDateString()
  start: string;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  @IsDateString()
  end: string;

  @ApiProperty({ example: 250000, minimum: 0 })
  @IsNumber()
  @Min(0)
  purchaseAmount: number;
}
