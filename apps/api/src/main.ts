import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create Fastify application for better performance
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://yahuti-trade-engine.vercel.app',
      configService.get('APP_URL'),
    ].filter(Boolean),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation (development only)
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Yahuti Trade Engine API')
      .setDescription('Digital Arbitrage Engine - Your Marketplace. Your Rules. Your Profit.')
      .setVersion('1.0')
      .addTag('yahuti')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Yahuti Trade Engine API running on port ${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();