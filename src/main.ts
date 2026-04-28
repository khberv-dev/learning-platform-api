import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validationPipe } from '@/common/pipe/validation.pipe';

async function bootstrap() {
  const logger = new Logger('App');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(validationPipe);

  await app.listen(port);
  logger.log(`Listening on :${port}`);
}
bootstrap();
