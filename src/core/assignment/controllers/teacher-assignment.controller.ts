import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('assignments')
export class TeacherAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('pending')
  findPending(@CurrentUser() user: { id: string }) {
    return this.assignmentService.findPendingForTeacher(user.id);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assignmentService.accept(user.id, id);
  }

  @Patch(':id/reject')
  reject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assignmentService.reject(user.id, id);
  }
}
