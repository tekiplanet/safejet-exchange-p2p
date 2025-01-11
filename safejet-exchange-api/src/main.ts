import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Important: This must come before any other middleware
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        // Store the raw body string
        req.rawBody = buf.toString();
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Serve static files from public directory
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));
  
  console.log('Serving static files from:', publicPath);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
