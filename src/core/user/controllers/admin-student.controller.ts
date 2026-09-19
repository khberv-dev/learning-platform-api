import { Body, Controller, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { StudentService } from '@/core/user/services/student.service';
import { StudentQuery } from '@/core/user/dto/student-query.dto';
import { SetUserPasswordDto } from '@/core/user/dto/set-user-password.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/students')
export class AdminStudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(@Query() query: StudentQuery) {
    return this.studentService.findAll(query);
  }

  @Patch(':id/password')
  @HttpCode(204)
  async setPassword(@Param('id') id: string, @Body() dto: SetUserPasswordDto): Promise<void> {
    await this.studentService.setPassword(id, dto.password);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }
}
