import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/services/course.service';

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

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

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
}
