import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from '@/core/call/entity/call.entity';
import { CallService } from '@/core/call/services/call.service';

@Module({
  imports: [TypeOrmModule.forFeature([Call])],
  providers: [CallService],
  exports: [CallService],
})
export class CallModule {}
