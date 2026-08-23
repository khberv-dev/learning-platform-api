import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { UpdateLiveLessonDto } from '@/core/live-lesson/dto/update-live-lesson.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.TEACHER)
@Controller('live-lessons')
export class LiveLessonController {
  constructor(private readonly liveLessonService: LiveLessonService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateLiveLessonDto) {
    return this.liveLessonService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.liveLessonService.findAll(user.id, query);
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  findMy(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.liveLessonService.findForStudent(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonService.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateLiveLessonDto) {
    return this.liveLessonService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.liveLessonService.remove(user.id, id);
  }
}
