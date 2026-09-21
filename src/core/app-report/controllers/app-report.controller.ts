import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '@/common/decorators/public.decorator';
import { AppReportService } from '@/core/app-report/services/app-report.service';
import { CreateAppReportDto } from '@/core/app-report/dto/create-app-report.dto';

@Public()
@Controller('app-reports')
export class AppReportController {
  constructor(private readonly appReportService: AppReportService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAppReportDto) {
    return this.appReportService.create(req.headers.authorization, dto);
  }
}
