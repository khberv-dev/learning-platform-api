import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { LiveLessonService } from '@/core/live-lesson/services/live-lesson.service';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { UpdateLiveLessonDto } from '@/core/live-lesson/dto/update-live-lesson.dto';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const lessonExample = {
  id: 'll000000-0000-0000-0000-000000000001',
  name: 'Speaking Practice — Unit 3',
  meetLink: 'https://meet.google.com/abc-defg-hij',
  startTime: '2026-05-20T15:00:00.000Z',
  endTime: '2026-05-20T16:00:00.000Z',
  assignment: {
    id: 'as000000-0000-0000-0000-000000000001',
    student: { user: { id: 'u1', firstName: 'Sevara', lastName: 'Karimova', avatar: null } },
    teacher: { user: { id: 'u2', firstName: 'John', lastName: 'Doe', avatar: null } },
  },
  createdAt: '2026-05-19T10:00:00.000Z',
  updatedAt: '2026-05-19T10:00:00.000Z',
};

const lessonListExample = {
  data: [{ ...lessonExample }],
  total: 4,
  page: 1,
  limit: 10,
  totalPages: 1,
};

@ApiTags('live-lessons')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('live-lessons')
export class LiveLessonController {
  constructor(private readonly liveLessonService: LiveLessonService) {}

  @Post()
  @ApiCreatedResponse({ schema: { example: lessonExample } })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateLiveLessonDto) {
    return this.liveLessonService.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ schema: { example: lessonListExample } })
  findAll(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.liveLessonService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: lessonExample } })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.liveLessonService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ schema: { example: lessonExample } })
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateLiveLessonDto) {
    return this.liveLessonService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.liveLessonService.remove(user.id, id);
  }
}
