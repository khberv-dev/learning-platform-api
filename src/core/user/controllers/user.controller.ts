import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/core/user/entity/user.entity';

const userExample = {
  id: '8b3c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01',
  firstName: 'Ali',
  lastName: 'Valiyev',
  avatar: null,
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
  @Get('me')
  @ApiOkResponse({ schema: { example: userExample } })
  me(@CurrentUser() user: User) {
    return user;
  }
}
