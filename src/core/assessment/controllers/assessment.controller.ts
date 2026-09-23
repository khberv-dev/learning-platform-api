import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';

@Roles(UserRole.STUDENT)
@Controller('student/assessments')
export class AssessmentController {
  constructor(private readonly configService: ConfigService) {}

  @Get('assembly-ai-key')
  getAssemblyAiKey() {
    return { apiKey: this.configService.getOrThrow<string>('ASSEMBLYAI_API_KEY') };
  }
}
