import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSource } from '@/shared/config/database.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/core/auth/auth.module';
import { UserModule } from '@/core/user/user.module';
import { CourseModule } from '@/core/course/course.module';
import { EnrollmentModule } from '@/core/enrollment/enrollment.module';
import { JwtAccessGuard } from '@/common/guard/jwt-access.guard';
import { RolesGuard } from '@/common/guard/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSource.options),
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    EnrollmentModule,
    CourseModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
