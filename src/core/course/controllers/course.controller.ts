import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/services/course.service';
import { TaskService } from '@/core/course/services/task.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  findActiveCourses(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.courseService.findActiveCoursesPaginated(user.id, query);
  }

  @Get(':id')
  findOneCourse(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.courseService.findOneActiveCourse(id, user.id);
  }

  @Get(':courseId/units/:unitId/lessons/:lessonId/tasks')
  listTasks(
    @CurrentUser() user: { id: string },
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.taskService.listTasksForStudent(courseId, unitId, lessonId, user.id, query);
  }
}
