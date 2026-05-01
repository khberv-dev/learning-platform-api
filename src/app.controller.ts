import { Controller, Get } from '@nestjs/common';
import dayjs from 'dayjs';
import { IsPublic } from '@/common/decorators/is-public.decorator';

@Controller()
@IsPublic()
export class AppController {
  @Get()
  status() {
    return {
      ok: true,
      timestamp: dayjs(),
    };
  }
}
