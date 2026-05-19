import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const studentListExample = {
  data: [
    {
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
    },
  ],
  total: 42,
  page: 1,
  limit: 10,
  totalPages: 5,
};

@ApiTags('students')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('students')
export class AdminStudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOkResponse({ schema: { example: studentListExample } })
  findAll(@Query() query: PaginationQuery) {
    return this.studentService.findAll(query);
  }
}
