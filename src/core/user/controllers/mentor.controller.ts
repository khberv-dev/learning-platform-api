import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MentorService } from '@/core/user/services/mentor.service';
import { UserService } from '@/core/user/services/user.service';
import { SetScheduleDto } from '@/core/user/dto/set-schedule.dto';
import { avatarFileFilter, avatarStorage, toAvatarPath } from '@/core/user/storage/avatar.storage';
import { introVideoFileFilter, mentorIntroStorage, toIntroVideoPath } from '@/core/user/storage/mentor-intro.storage';

@Roles(UserRole.MENTOR)
@Controller('mentor/me')
export class MentorController {
  constructor(
    private readonly mentorService: MentorService,
    private readonly userService: UserService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    await this.userService.recordDailyActivity(user);
    return user;
  }

  @Post('activity')
  @HttpCode(200)
  recordActivity(@CurrentUser() user: AuthUser) {
    return this.userService.recordDailyActivity(user);
  }

  @Get('streak')
  streak(@CurrentUser() user: AuthUser) {
    return this.userService.getStreak(user);
  }

  @Patch('avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFileFilter }))
  uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Rasm yuborilmagan');
    return this.userService.updateAvatar(user, toAvatarPath(file.filename));
  }

  @Get('summary')
  summary(@CurrentUser() user: { id: string }) {
    return this.mentorService.getSummaryForMentor(user.id);
  }

  @Patch('schedule')
  setSchedule(@CurrentUser() user: { id: string }, @Body() dto: SetScheduleDto) {
    return this.mentorService.setSchedule(user.id, dto.schedule);
  }

  @Get('schedule')
  getMySchedule(@CurrentUser() user: { id: string }) {
    return this.mentorService.getMySchedule(user.id);
  }

  @Patch('intro-video')
  @UseInterceptors(FileInterceptor('video', { storage: mentorIntroStorage, fileFilter: introVideoFileFilter }))
  updateIntroVideo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    return this.mentorService.updateIntroVideo(user.id, toIntroVideoPath(file.filename));
  }
}
