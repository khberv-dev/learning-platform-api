import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppReport } from '@/core/app-report/entity/app-report.entity';
import { AppReportService } from '@/core/app-report/services/app-report.service';
import { AppReportController } from '@/core/app-report/controllers/app-report.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppReport]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AppReportController],
  providers: [AppReportService],
})
export class AppReportModule {}
