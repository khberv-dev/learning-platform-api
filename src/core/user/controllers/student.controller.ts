import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { UserService } from '@/core/user/services/user.service';

@ApiTags('students')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('students')
export class StudentController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.userService.findStudentMe(user.id);
  }
}
