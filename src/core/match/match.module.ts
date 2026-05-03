import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '@/core/user/user.module';
import { MatchService } from '@/core/match/services/match.service';
import { MatchGateway } from '@/core/match/gateways/match.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
      }),
    }),
    UserModule,
  ],
  providers: [MatchService, MatchGateway],
})
export class MatchModule {}
