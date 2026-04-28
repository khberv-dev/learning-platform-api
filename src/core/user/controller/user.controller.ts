import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { User } from '@/core/user/entity/user.entity';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }
}
