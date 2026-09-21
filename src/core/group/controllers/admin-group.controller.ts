import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { GroupService } from '@/core/group/services/group.service';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/core/group/dto/update-group.dto';
import { GroupQuery } from '@/core/group/dto/group-query.dto';
import { AddGroupStudentsDto } from '@/core/group/dto/add-group-students.dto';
import { SwapGroupStudentDto } from '@/core/group/dto/swap-group-student.dto';
import { AssignPrimaryMentorDto } from '@/core/group/dto/assign-primary-mentor.dto';
import { AddSupportMentorDto } from '@/core/group/dto/add-support-mentor.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/groups')
export class AdminGroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupService.createGroup(dto);
  }

  @Get()
  findAll(@Query() query: GroupQuery) {
    return this.groupService.findAllGroups(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOneGroup(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupService.updateGroup(id, dto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.groupService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.groupService.setActive(id, false);
  }

  @Post(':id/students')
  addStudents(@Param('id') id: string, @Body() dto: AddGroupStudentsDto) {
    return this.groupService.addStudents(id, dto.studentIds);
  }

  @Delete(':id/students/:studentId')
  removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.groupService.removeStudents(id, [studentId]);
  }

  @Patch(':id/students/:studentId/swap')
  swapStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Body() dto: SwapGroupStudentDto) {
    return this.groupService.swapStudent(id, studentId, dto.toGroupId);
  }

  @Patch(':id/primary-mentor')
  assignPrimaryMentor(@Param('id') id: string, @Body() dto: AssignPrimaryMentorDto) {
    return this.groupService.assignPrimaryMentor(id, dto.mentorId);
  }

  @Post(':id/support-mentors')
  addSupportMentor(@Param('id') id: string, @Body() dto: AddSupportMentorDto) {
    return this.groupService.addSupportMentor(id, dto.mentorId);
  }

  @Delete(':id/mentors/:mentorId')
  removeMentor(@Param('id') id: string, @Param('mentorId') mentorId: string) {
    return this.groupService.removeMentor(id, mentorId);
  }
}
