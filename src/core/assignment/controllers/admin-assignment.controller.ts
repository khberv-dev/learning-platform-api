import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { AssignMentorDto } from '@/core/assignment/dto/assign-mentor.dto';
import { AssignmentQuery } from '@/core/assignment/dto/assignment-query.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/assignments')
export class AdminAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  findAll(@Query() query: AssignmentQuery) {
    return this.assignmentService.findAllAssignments(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentService.findOneAssignment(id);
  }

  @Patch(':id/mentor')
  assignMentor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignMentorDto) {
    return this.assignmentService.assignMentor(id, dto.mentorId);
  }
}
