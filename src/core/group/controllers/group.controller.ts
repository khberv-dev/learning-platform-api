import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { GroupService } from '@/core/group/services/group.service';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/core/group/dto/update-group.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const groupExample = {
  id: 'gr000000-0000-0000-0000-000000000001',
  name: 'IELTS Speaking Club',
  description: 'Wednesday evenings, intermediate level',
  isActive: true,
  createdAt: '2026-05-19T10:00:00.000Z',
  updatedAt: '2026-05-19T10:00:00.000Z',
};

const studentExample = {
  id: 'f2c8a0e0-1111-2222-3333-444455556666',
  points: 120,
  coins: 30,
  level: 'A1',
  user: {
    id: '8b3c7c0e-3a1c-4e0a-9b8a-2c4d5e6f7a01',
    firstName: 'Ali',
    lastName: 'Valiyev',
    phoneNumber: '998900012644',
  },
};

const groupDetailExample = { ...groupExample, students: [studentExample] };

const groupListExample = {
  data: [groupExample],
  total: 4,
  page: 1,
  limit: 10,
  totalPages: 1,
};

@ApiTags('groups')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: { ...groupExample, students: [] } } })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateGroupDto) {
    return this.groupService.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ schema: { example: groupListExample } })
  findAll(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.groupService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: groupDetailExample } })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ schema: { example: groupExample } })
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupService.update(user.id, id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ schema: { example: { ...groupExample, isActive: false } } })
  deactivate(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupService.deactivate(user.id, id);
  }

  @Post(':id/students/:studentId')
  @ApiCreatedResponse({ schema: { example: groupDetailExample } })
  addStudent(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.groupService.addStudent(user.id, id, studentId);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(204)
  @ApiNoContentResponse()
  async removeStudent(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    await this.groupService.removeStudent(user.id, id, studentId);
  }
}
