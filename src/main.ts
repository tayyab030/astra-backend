import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import dns from 'dns';
import { AppModule } from './app.module';
import { createValidationPipe } from './validation.pipe';

dns.setDefaultResultOrder('ipv4first');

function isPrivateLanHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.0.2.2' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fallbackOrigin =
    process.env.FRONTEND_URL ??
    process.env.FRONTEND_LOGIN_URL?.replace(/\/login\/?$/, '') ??
    'http://localhost:3000';
  const allowed = configured?.length ? configured : [fallbackOrigin];

  if (allowed.includes('*') || allowed.includes(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      isPrivateLanHost(hostname)
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization'],
  });

  app.useGlobalPipes(createValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
