import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/assignments')
export class StudentAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  request(@CurrentUser() user: { id: string }, @Body() dto: CreateAssignmentDto) {
    return this.assignmentService.requestAssignment(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.assignmentService.findStudentAssignments(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentService.findOneForStudent(user.id, id);
  }
}
