import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { SessionService } from '@/core/session/services/session.service';
import { SessionController } from '@/core/session/controllers/session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session])],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
