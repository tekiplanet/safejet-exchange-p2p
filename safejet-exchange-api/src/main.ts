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
      limit: '10mb',
      verify: (req: any, res, buf) => {
        // Store the raw body string
        req.rawBody = buf.toString();
      },
    }),
  );

  app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3001',           // Admin dashboard local
      'http://192.168.0.103:3001',      // Admin on local network
      /\.ngrok-free\.app$/,             // Any ngrok domain
      'http://localhost:3000',          // Flutter web if needed
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Serve static files from public directory
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));
  
  console.log('Serving static files from:', publicPath);

  // Add logging
  console.log('Registered routes:');
  const server = app.getHttpServer();
  const router = server._events.request._router;
  
  const availableRoutes = router.stack
    .map(layer => {
      if (layer.route) {
        return {
          route: {
            path: layer.route?.path,
            method: layer.route?.stack[0].method,
          },
        };
      }
    })
    .filter(item => item !== undefined);
  
  console.log(availableRoutes);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
