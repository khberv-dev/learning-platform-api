import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('assignments')
export class AdminAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: AssignmentStatus, required: false })
  findAll(@Query('status', new ParseEnumPipe(AssignmentStatus, { optional: true })) status?: AssignmentStatus) {
    return this.assignmentService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }
}
