import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';

const assignmentExample = {
  id: 'as000000-0000-0000-0000-000000000001',
  status: 'PENDING',
  startDate: '2026-05-10T09:00:00.000Z',
  endDate: '2026-08-10T09:00:00.000Z',
  teacher: { id: 'ab12cd34-5678-90ef-1234-567890abcdef', user: { firstName: 'Sevara' } },
  student: { id: 'f2c8a0e0-1111-2222-3333-444455556666', user: { firstName: 'Ali' } },
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('assignments')
export class AdminAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: AssignmentStatus, required: false })
  @ApiOkResponse({ schema: { example: [assignmentExample] } })
  findAll(@Query('status', new ParseEnumPipe(AssignmentStatus, { optional: true })) status?: AssignmentStatus) {
    return this.assignmentService.findAll(status);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: assignmentExample } })
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }
}
