import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required for Plaid webhook signature verification
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Restrict CORS to the deployed frontend domain.
  // FRONTEND_URL supports comma-separated origins for multiple environments.
  // Falls back to localhost for local development.
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
    : ['http://localhost:3006', 'http://127.0.0.1:3006'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Railway injects PORT automatically — fallback to 3005 for local dev
  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Ayende CX Bookkeeping API running on port ${port}`);
}

bootstrap();
