import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '@/core/user/user.module';
import { Otp } from '@/core/auth/entity/otp.entity';
import { AuthService } from '@/core/auth/services/auth.service';
import { AuthController } from '@/core/auth/controllers/auth.controller';
import { JwtAccessStrategy } from '@/core/auth/strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from '@/core/auth/strategies/jwt-refresh.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Otp]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow('JWT_ACCESS_EXPIRE'),
        },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
