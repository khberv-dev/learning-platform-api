import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppReport } from '@/core/app-report/entity/app-report.entity';
import { CreateAppReportDto } from '@/core/app-report/dto/create-app-report.dto';

@Injectable()
export class AppReportService {
  constructor(
    @InjectRepository(AppReport) private readonly reportRepo: Repository<AppReport>,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveUserId(authorization: string | undefined): Promise<string | null> {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(authorization.slice(7));
      return payload.sub;
    } catch {
      return null;
    }
  }

  async create(authorization: string | undefined, dto: CreateAppReportDto): Promise<AppReport> {
    const userId = await this.resolveUserId(authorization);
    return this.reportRepo.save({ device: dto.device, message: dto.message, userId });
  }
}
