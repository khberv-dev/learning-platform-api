import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/core/user/entity/user.entity';
import { UserService } from '@/core/user/services/user.service';
import { avatarFileFilter, avatarStorage, toAvatarPath } from '@/core/user/storage/avatar.storage';

const userExample = {
  id: '8b3c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01',
  firstName: 'Ali',
  lastName: 'Valiyev',
  avatar: '/avatar/2f9c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01.png',
  email: 'ali@example.com',
  phoneNumber: '998900012644',
  isActive: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
  roles: ['student'],
};

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOkResponse({ schema: { example: { ...userExample, avatar: null } } })
  me(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['avatar'], properties: { avatar: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ schema: { example: userExample } })
  uploadAvatar(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Rasm yuborilmagan');
    return this.userService.updateAvatar(user.id, toAvatarPath(file.filename));
  }
}
