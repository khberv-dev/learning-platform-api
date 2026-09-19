import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { introVideoFileFilter, mentorIntroStorage, toIntroVideoPath } from '@/core/user/storage/mentor-intro.storage';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MentorService } from '@/core/user/services/mentor.service';
import { CreateMentorDto } from '@/core/user/dto/create-mentor.dto';
import { UpdateMentorDto } from '@/core/user/dto/update-mentor.dto';
import { ChangeMentorStatusDto } from '@/core/user/dto/change-mentor-status.dto';
import { MentorQuery } from '@/core/user/dto/mentor-query.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/mentors')
export class AdminMentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Post()
  create(@Body() dto: CreateMentorDto) {
    return this.mentorService.createMentor(dto);
  }

  @Get()
  findAll(@Query() query: MentorQuery) {
    return this.mentorService.findAllMentors(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mentorService.findOneMentor(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMentorDto) {
    return this.mentorService.updateMentor(id, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeMentorStatusDto, @CurrentUser() user: { id: string }) {
    return this.mentorService.changeStatus(id, dto, user.id);
  }

  @Patch(':id/intro-video')
  @UseInterceptors(FileInterceptor('video', { storage: mentorIntroStorage, fileFilter: introVideoFileFilter }))
  uploadIntroVideo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.mentorService.updateIntroVideoById(id, toIntroVideoPath(file.filename));
  }
}
