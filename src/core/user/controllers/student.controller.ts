import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';

const studentExample = {
  id: 'f2c8a0e0-1111-2222-3333-444455556666',
  points: 120,
  coins: 30,
  level: 'A1',
  user: {
    id: '8b3c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01',
    firstName: 'Ali',
    lastName: 'Valiyev',
    avatar: null,
    email: 'ali@example.com',
    phoneNumber: '998900012644',
    isActive: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('students')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('me')
  @ApiOkResponse({ schema: { example: studentExample } })
  me(@CurrentUser() user: { id: string }) {
    return this.studentService.findMe(user.id);
  }
}
