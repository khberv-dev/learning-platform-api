import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { introVideoFileFilter, teacherIntroStorage, toIntroVideoPath } from '@/core/user/storage/teacher-intro.storage';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/services/teacher.service';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';
import { UpdateTeacherDto } from '@/core/user/dto/update-teacher.dto';
import { ChangeTeacherStatusDto } from '@/core/user/dto/change-teacher-status.dto';
import { TeacherQuery } from '@/core/user/dto/teacher-query.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/teachers')
export class AdminTeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.createTeacher(dto);
  }

  @Get()
  findAll(@Query() query: TeacherQuery) {
    return this.teacherService.findAllTeachers(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneTeacher(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.updateTeacher(id, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeTeacherStatusDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.changeStatus(id, dto, user.id);
  }

  @Patch(':id/intro-video')
  @UseInterceptors(FileInterceptor('video', { storage: teacherIntroStorage, fileFilter: introVideoFileFilter }))
  uploadIntroVideo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.teacherService.updateIntroVideoById(id, toIntroVideoPath(file.filename));
  }
}
