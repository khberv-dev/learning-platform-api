import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PendingEnrollmentService } from '@/core/enrollment/services/pending-enrollment.service';
import { AcceptPendingEnrollmentDto } from '@/core/enrollment/dto/accept-pending-enrollment.dto';
import { PendingEnrollmentQuery } from '@/core/enrollment/dto/pending-enrollment-query.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/pending-enrollments')
export class AdminPendingEnrollmentController {
  constructor(private readonly pendingEnrollmentService: PendingEnrollmentService) {}

  @Get()
  findAll(@Query() query: PendingEnrollmentQuery) {
    return this.pendingEnrollmentService.findAllPending(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pendingEnrollmentService.findOnePending(id);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Body() dto: AcceptPendingEnrollmentDto) {
    return this.pendingEnrollmentService.acceptPending(id, dto);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.pendingEnrollmentService.rejectPending(id);
  }
}
