import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssignmentService } from '@/core/assignment/services/assignment.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const assignmentExample = {
  id: 'as000000-0000-0000-0000-000000000001',
  status: 'PENDING',
  startDate: '2026-05-10T09:00:00.000Z',
  endDate: '2026-08-10T09:00:00.000Z',
  teacher: { id: 'ab12cd34-5678-90ef-1234-567890abcdef' },
  student: {
    id: 'f2c8a0e0-1111-2222-3333-444455556666',
    user: { firstName: 'Ali', lastName: 'Valiyev' },
  },
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('assignments')
export class TeacherAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('pending')
  @ApiOkResponse({ schema: { example: [assignmentExample] } })
  findPending(@CurrentUser() user: { id: string }) {
    return this.assignmentService.findPendingForTeacher(user.id);
  }

  @Get('history')
  @ApiOkResponse({
    schema: {
      example: {
        data: [{ ...assignmentExample, status: 'ACTIVE' }],
        total: 7,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  findHistory(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.assignmentService.findAssignmentsForTeacher(user.id, query);
  }

  @Patch(':id/accept')
  @ApiOkResponse({ schema: { example: { ...assignmentExample, status: 'ACTIVE' } } })
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assignmentService.accept(user.id, id);
  }

  @Patch(':id/reject')
  @ApiOkResponse({ schema: { example: { ...assignmentExample, status: 'REJECTED' } } })
  reject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assignmentService.reject(user.id, id);
  }
}
