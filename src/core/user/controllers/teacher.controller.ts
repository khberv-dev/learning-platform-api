import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/services/teacher.service';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { SetScheduleDto } from '@/core/user/dto/set-schedule.dto';
import { introVideoFileFilter, teacherIntroStorage, toIntroVideoPath } from '@/core/user/storage/teacher-intro.storage';

@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  findActive() {
    return this.teacherService.findActiveTeachers();
  }

  @Get('me/summary')
  @Roles(UserRole.TEACHER)
  summary(@CurrentUser() user: { id: string }) {
    return this.teacherService.getSummaryForTeacher(user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneActiveTeacher(id);
  }

  @Post(':id/feedbacks')
  @Roles(UserRole.STUDENT)
  addFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.addFeedback(id, user.id, dto);
  }

  @Patch('me/schedule')
  @Roles(UserRole.TEACHER)
  setSchedule(@CurrentUser() user: { id: string }, @Body() dto: SetScheduleDto) {
    return this.teacherService.setSchedule(user.id, dto.schedule);
  }

  @Get('me/schedule')
  @Roles(UserRole.TEACHER)
  getMySchedule(@CurrentUser() user: { id: string }) {
    return this.teacherService.getMySchedule(user.id);
  }

  @Get(':id/schedule')
  @Roles(UserRole.STUDENT)
  getSchedule(@Param('id') id: string) {
    return this.teacherService.getSchedule(id);
  }

  @Patch('me')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('video', { storage: teacherIntroStorage, fileFilter: introVideoFileFilter }))
  updateIntroVideo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    return this.teacherService.updateIntroVideo(user.id, toIntroVideoPath(file.filename));
  }
}
