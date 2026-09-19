import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { validationPipe } from '@/common/pipes/validation.pipe';
import { getEnvironment } from '@/shared/config/environment.config';

const API_VERSION = 2;

async function bootstrap() {
  const logger = new Logger('App');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const apiPrefix = `api/v${API_VERSION}`;

  app.setGlobalPrefix(apiPrefix);
  app.enableCors();
  app.useGlobalPipes(validationPipe);

  await app.listen(port);
  logger.log(`Environment: ${getEnvironment(configService)}`);
  logger.log(`API prefix: /${apiPrefix}`);
  logger.log(`Listening on :${port}`);
}

bootstrap();
