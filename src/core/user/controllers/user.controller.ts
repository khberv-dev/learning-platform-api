import { BadRequestException, Controller, Get, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/core/user/entity/user.entity';
import { UserService } from '@/core/user/services/user.service';
import { avatarFileFilter, avatarStorage, toAvatarPath } from '@/core/user/storage/avatar.storage';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFileFilter }))
  uploadAvatar(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Rasm yuborilmagan');
    return this.userService.updateAvatar(user.id, toAvatarPath(file.filename));
  }
}
