import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createValidationPipe } from './validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const fallbackOrigin =
    process.env.FRONTEND_URL ??
    process.env.FRONTEND_LOGIN_URL?.replace(/\/login\/?$/, '') ??
    'http://localhost:3000';
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : fallbackOrigin,
    credentials: true,
  });

  app.useGlobalPipes(createValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
