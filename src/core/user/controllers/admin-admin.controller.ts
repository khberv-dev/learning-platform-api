import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SuperadminGuard } from '@/common/guards/superadmin.guard';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AdminService } from '@/core/user/services/admin.service';
import { CreateAdminDto } from '@/core/user/dto/create-admin.dto';
import { UpdateAdminDto } from '@/core/user/dto/update-admin.dto';
import { AdminQuery } from '@/core/user/dto/admin-query.dto';

@Roles(UserRole.ADMIN)
@UseGuards(SuperadminGuard)
@Controller('admin/admins')
export class AdminAdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Get()
  findAll(@Query() query: AdminQuery) {
    return this.adminService.findAllAdmins(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOneAdmin(id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(user.id, id, dto);
  }
}
