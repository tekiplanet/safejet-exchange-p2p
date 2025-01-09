import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Important: This must come before any other middleware
  app.use(bodyParser.json({
    verify: (req: any, res, buf) => {
      // Store the raw body string
      req.rawBody = buf.toString();
    }
  }));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors();


    // Enable CORS
  
  // Add raw body parser
  // app.use(express.json({
  //   verify: (req: any, res, buf) => {
  //     req.rawBody = buf;
  //   }
  // }));

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
