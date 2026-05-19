import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';

const assignmentExample = {
  id: 'as000000-0000-0000-0000-000000000001',
  status: 'PENDING',
  startDate: '2026-05-10T09:00:00.000Z',
  endDate: '2026-08-10T09:00:00.000Z',
  teacher: { id: 'ab12cd34-5678-90ef-1234-567890abcdef' },
  student: { id: 'f2c8a0e0-1111-2222-3333-444455556666' },
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('assignments')
export class StudentAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: assignmentExample } })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAssignmentDto) {
    return this.assignmentService.createOffer(user.id, dto);
  }
}
