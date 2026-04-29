import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/service/teacher.service';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';
import { UpdateTeacherDto } from '@/core/user/dto/update-teacher.dto';
import { ChangeTeacherStatusDto } from '@/core/user/dto/change-teacher-status.dto';

@ApiTags('teachers')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('teachers')
export class AdminTeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.createTeacher(dto);
  }

  @Get()
  findAll() {
    return this.teacherService.findAllTeachers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneTeacher(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.updateTeacher(id, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeTeacherStatusDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.changeStatus(id, dto, user.id);
  }
}
