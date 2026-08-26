import { Controller, Get } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';
import { UserService } from '@/core/user/services/user.service';

@Roles(UserRole.STUDENT)
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly userService: UserService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    await this.userService.recordDailyActivity(user.id);
    return this.studentService.findMe(user.id);
  }
}
