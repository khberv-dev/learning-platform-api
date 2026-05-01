import { Controller, Get } from '@nestjs/common';
import dayjs from 'dayjs';
import { Public } from '@/common/decorators/public.decorator';

@Controller()
@Public()
export class AppController {
  @Get()
  status() {
    return {
      ok: true,
      timestamp: dayjs(),
    };
  }
}
