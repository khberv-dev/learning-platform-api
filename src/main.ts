import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validationPipe } from '@/common/pipes/validation.pipe';
import { getEnvironment } from '@/shared/config/environment.config';

async function bootstrap() {
  const logger = new Logger('App');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(validationPipe);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Learning Platform API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Auth', in: 'header' }, 'X-Auth')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  // Muhit boshida ko'rinib tursin — OTP, SMS va log xatti-harakati shunga bog'liq.
  logger.log(`Environment: ${getEnvironment(configService)}`);
  logger.log(`Listening on :${port}`);
  logger.log(`Swagger is running on /docs`);
}

bootstrap();
