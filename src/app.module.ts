import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSource } from '@/shared/config/database.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/core/auth/auth.module';
import { UserModule } from '@/core/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSource.options),
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
