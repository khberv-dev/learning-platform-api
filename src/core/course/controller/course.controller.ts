import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/service/course.service';

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  findActiveCourses() {
    return this.courseService.findActiveCourses();
  }

  @Get(':id')
  findOneCourse(@Param('id') id: string) {
    return this.courseService.findOneActiveCourse(id);
  }
}
