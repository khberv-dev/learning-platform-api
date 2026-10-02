import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.MENTOR)
@Controller('mentor/assignments')
export class MentorAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  findMine(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.assignmentService.findMentorAssignments(user.id, query);
  }
}
