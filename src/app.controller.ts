import { Controller, Get } from '@nestjs/common';
import dayjs from 'dayjs';
import { IsPublic } from '@/common/decorator/is-public.decorator';

@Controller()
@IsPublic()
export class AppController {
  @Get()
  getHello() {
    return {
      ok: true,
      timestamp: dayjs(),
    };
  }
}
