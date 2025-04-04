import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true,
      transports: ['websocket'],
    });
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    cors: {
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'ngrok-skip-browser-warning'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    }
  });

  // Use our custom WebSocket adapter
  app.useWebSocketAdapter(new CustomIoAdapter(app));

  // CORS middleware should be first
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Then other middleware
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

  // Listen on all interfaces
  await app.listen(3000, '0.0.0.0');
  console.log('Application is running on: http://localhost:3000');
  console.log('WebSocket server is running on port 3000');
}
bootstrap();
