import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';

const availableCoursesExample = [
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    title: 'English A2',
    description: "O'rta bosqich",
    image: '/public/course/eng-a2.png',
    price: 300000,
    isActive: true,
  },
];

const myCoursesExample = [
  {
    id: 'en000000-0000-0000-0000-000000000001',
    start: '2026-05-18T00:00:00.000Z',
    end: '2026-08-18T00:00:00.000Z',
    course: {
      id: 'c0000000-0000-0000-0000-000000000001',
      title: 'English A1',
      image: '/public/course/eng-a1.png',
    },
    progressPercent: 35,
  },
];

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('courses')
export class StudentCourseController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('available')
  @ApiOkResponse({ schema: { example: availableCoursesExample } })
  getAvailable(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getAvailableCourses(user.id);
  }

  @Get('me')
  @ApiOkResponse({ schema: { example: myCoursesExample } })
  getMyCourses(@CurrentUser() user: { id: string }) {
    return this.enrollmentService.getMyCourses(user.id);
  }
}
