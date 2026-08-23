import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';
import { StudentQuery } from '@/core/user/dto/student-query.dto';

@Roles(UserRole.ADMIN)
@Controller('students')
export class AdminStudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
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
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }
}
