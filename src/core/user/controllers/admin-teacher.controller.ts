import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/services/teacher.service';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';
import { UpdateTeacherDto } from '@/core/user/dto/update-teacher.dto';
import { ChangeTeacherStatusDto } from '@/core/user/dto/change-teacher-status.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const teacherExample = {
  id: 'ab12cd34-5678-90ef-1234-567890abcdef',
  status: 'ACTIVE',
  profession: 'IELTS instructor',
  introVideo: null,
  user: {
    id: '11111111-2222-3333-4444-555555555555',
    firstName: 'Sevara',
    lastName: 'Karimova',
    avatar: null,
    email: 'sevara@example.com',
    phoneNumber: '998901234567',
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-01-10T08:00:00.000Z',
};

const teacherListExample = {
  data: [teacherExample],
  total: 12,
  page: 1,
  limit: 10,
  totalPages: 2,
};

const teacherDetailExample = {
  ...teacherExample,
  statusHistories: [
    {
      id: 'sh000000-0000-0000-0000-000000000001',
      oldStatus: 'INACTIVE',
      newStatus: 'ACTIVE',
      changedBy: { id: 'admin-uuid', user: { firstName: 'Admin' } },
      createdAt: '2026-02-01T09:00:00.000Z',
    },
  ],
};

@ApiTags('teachers')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('teachers')
export class AdminTeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: teacherExample } })
  create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.createTeacher(dto);
  }

  @Get()
  @ApiOkResponse({ schema: { example: teacherListExample } })
  findAll(@Query() query: PaginationQuery) {
    return this.teacherService.findAllTeachers(query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: teacherDetailExample } })
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneTeacher(id);
  }

  @Patch(':id')
  @ApiOkResponse({ schema: { example: teacherDetailExample } })
  update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.updateTeacher(id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ schema: { example: { ...teacherDetailExample, status: 'INACTIVE' } } })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeTeacherStatusDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.changeStatus(id, dto, user.id);
  }
}
