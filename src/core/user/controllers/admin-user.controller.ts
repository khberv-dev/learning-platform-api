import { Body, Controller, HttpCode, Param, Patch } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { SetUserPasswordDto } from '@/core/user/dto/set-user-password.dto';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { UserService } from '@/core/user/services/user.service';

@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':id/password')
  @HttpCode(204)
  async setPassword(@Param('id') id: string, @Body() dto: SetUserPasswordDto): Promise<void> {
    await this.userService.setPassword(id, dto.password);
  }
}
