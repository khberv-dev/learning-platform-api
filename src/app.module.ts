import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { dataSource } from '@/shared/config/database.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/core/auth/auth.module';
import { UserModule } from '@/core/user/user.module';
import { CourseModule } from '@/core/course/course.module';
import { EnrollmentModule } from '@/core/enrollment/enrollment.module';
import { AssignmentModule } from '@/core/assignment/assignment.module';
import { ChatModule } from '@/core/chat/chat.module';
import { LiveLessonModule } from '@/core/live-lesson/live-lesson.module';
import { AssessmentModule } from '@/core/assessment/assessment.module';
import { MatchModule } from '@/core/match/match.module';
import { CallModule } from '@/core/call/call.module';
import { StatsModule } from '@/core/stats/stats.module';
import { MaterialModule } from '@/core/material/material.module';
import { PaymentModule } from '@/core/payment/payment.module';
import { PlanModule } from '@/core/plan/plan.module';
import { ExternalModule } from '@/core/external/external.module';
import { SessionModule } from '@/core/session/session.module';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSource.options),
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/public',
    }),
    AuthModule,
    UserModule,
    EnrollmentModule,
    CourseModule,
    AssignmentModule,
    ChatModule,
    LiveLessonModule,
    AssessmentModule,
    MatchModule,
    CallModule,
    StatsModule,
    MaterialModule,
    PaymentModule,
    PlanModule,
    ExternalModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // DEPLOYMENT muhitida o'zini o'chiradi.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
