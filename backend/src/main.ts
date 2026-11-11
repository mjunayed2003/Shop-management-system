import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import morgan from 'morgan';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Disable HTTP 304 ETag Caching so API routes always return fresh 200 OK
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('etag', false);
  }

  // Ensure uploads directory exists and serve statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // Prevent browser 304 caching on dynamic API routes
  app.use((_req: any, res: any, next: any) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin?.split(',') || true,
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Terminal HTTP Request Logger
  app.use(morgan('dev'));

  // Swagger (OpenAPI) Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shop Management SaaS API')
    .setDescription('REST API documentation for Shop Management SaaS backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  logger.log(`🚀 Server is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger Docs available at: http://localhost:${port}/api/docs`);
}

await bootstrap();
