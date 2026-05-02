import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('assignments')
export class StudentAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAssignmentDto) {
    return this.assignmentService.createOffer(user.id, dto);
  }
}
