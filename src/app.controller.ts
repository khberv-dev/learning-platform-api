import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import dayjs from 'dayjs';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('status')
@Controller()
@Public()
export class AppController {
  @Get()
  @ApiOkResponse({ schema: { example: { ok: true, timestamp: '2026-05-18T12:00:00.000Z' } } })
  status() {
    return {
      ok: true,
      timestamp: dayjs(),
    };
  }
}
