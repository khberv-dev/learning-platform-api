import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/services/course.service';
import { TaskService } from '@/core/course/services/task.service';

const courseExample = {
  id: 'c0000000-0000-0000-0000-000000000001',
  title: 'English A1',
  description: 'Boshlangich ingliz tili kursi',
  image: '/public/course/eng-a1.png',
  price: 0,
  isActive: true,
  units: [
    {
      id: 'u0000000-0000-0000-0000-000000000001',
      title: 'Unit 1: Greetings',
      lessons: [
        {
          id: 'l0000000-0000-0000-0000-000000000001',
          title: 'Hello!',
          description: 'Saying hello',
          media: '/public/lesson/hello.mp4',
          createdAt: '2026-01-15T10:00:00.000Z',
          updatedAt: '2026-01-15T10:00:00.000Z',
        },
      ],
      lessonsCount: 1,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
  ],
  lessonsCount: 1,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const taskExample = {
  id: 't0000000-0000-0000-0000-000000000001',
  task: 'Choose the correct greeting.',
  options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'],
  answer: 'Hello',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @ApiOkResponse({ schema: { example: [courseExample] } })
  findActiveCourses() {
    return this.courseService.findActiveCourses();
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: courseExample } })
  findOneCourse(@Param('id') id: string) {
    return this.courseService.findOneActiveCourse(id);
  }

  @Get(':courseId/units/:unitId/lessons/:lessonId/tasks')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOkResponse({ schema: { example: [taskExample] } })
  listTasks(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.taskService.listTasks(courseId, unitId, lessonId);
  }
}
