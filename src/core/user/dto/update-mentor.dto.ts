import { PartialType } from '@nestjs/mapped-types';
import { CreateMentorDto } from '@/core/user/dto/create-mentor.dto';

export class UpdateMentorDto extends PartialType(CreateMentorDto) {}
