import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';
import { StudentQuery } from '@/core/user/dto/student-query.dto';

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

const studentDetailExample = {
  id: 'f2c8a0e0-1111-2222-3333-444455556666',
  points: 120,
  coins: 30,
  balance: 50000,
  level: 'a1',
  user: {
    id: '8b3c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01',
    firstName: 'Ali',
    lastName: 'Valiyev',
    avatar: null,
    email: 'ali@example.com',
    phoneNumber: '998900012644',
    isActive: true,
  },
  enrollments: [
    {
      id: 'en000000-0000-0000-0000-000000000001',
      status: 'active',
      start: '2026-05-18T00:00:00.000Z',
      end: '2026-08-18T00:00:00.000Z',
      course: { id: 'c0000000-0000-0000-0000-000000000001', title: 'English A1' },
    },
  ],
  createdAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('students')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('students')
export class AdminStudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOperation({
    summary: "Talabalar ro'yxati",
    description:
      'Filtr: `search` (ism, familiya, telefon, email), `level`, `isActive`. Saralash: `sortBy` ' +
      '(`createdAt`, `updatedAt`, `points`, `coins`, `balance`, `level`, `firstName`, `lastName`) ' +
      'va `sortOrder` (`ASC` / `DESC`).',
  })
  @ApiOkResponse({ schema: { example: studentListExample } })
  findAll(@Query() query: StudentQuery) {
    return this.studentService.findAll(query);
  }

  /**
   * DIQQAT: bu marshrut `students/me` bilan raqobatlashadi — u boshqa
   * kontrollerda (`StudentController`) turadi. `user.module.ts` dagi
   * `controllers` ro'yxatida `StudentController` birinchi bo'lgani uchun
   * `students/me` avval ro'yxatdan o'tadi va shu sababli ishlaydi.
   * Ro'yxat tartibini o'zgartirmang.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Talaba profili — yozilgan kurslari bilan' })
  @ApiOkResponse({ schema: { example: studentDetailExample } })
  @ApiNotFoundResponse({ schema: { example: { message: 'Talaba topilmadi', statusCode: 404 } } })
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }
}
