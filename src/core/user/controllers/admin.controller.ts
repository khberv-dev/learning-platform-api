import {
  BadRequestException,
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
import { UserService } from '@/core/user/services/user.service';
import { avatarFileFilter, avatarStorage, toAvatarPath } from '@/core/user/storage/avatar.storage';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    await this.userService.recordDailyActivity(user);
    return user;
  }

  @Post('me/activity')
  @HttpCode(200)
  recordActivity(@CurrentUser() user: AuthUser) {
    return this.userService.recordDailyActivity(user);
  }

  @Get('me/streak')
  streak(@CurrentUser() user: AuthUser) {
    return this.userService.getStreak(user);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFileFilter }))
  uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Rasm yuborilmagan');
    return this.userService.updateAvatar(user, toAvatarPath(file.filename));
  }
}
