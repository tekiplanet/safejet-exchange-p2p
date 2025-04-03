import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  namespace: 'p2p/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class P2PChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(P2PChatGateway.name);
  private connectedClients = new Map<string, string>(); // userId -> socketId

  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      this.connectedClients.set(userId, client.id);
      this.logger.log(`Chat client connected: ${userId}`);

      // Join user's room for private messages
      client.join(`user_${userId}`);

      // Handle joining order chat room
      client.on('joinOrder', (orderId: string) => {
        client.join(`order_${orderId}`);
        this.logger.log(`Client joined order chat: ${orderId}`);
      });

    } catch (error) {
      this.logger.error('Chat connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(userId);
        this.logger.log(`Chat client disconnected: ${userId}`);
        break;
      }
    }
  }

  // Method to emit chat updates
  async emitChatUpdate(orderId: string, message: any) {
    try {
      this.server.to(`order_${orderId}`).emit('chatUpdate', message);
      this.logger.log(`Chat update emitted for order: ${orderId}`);
    } catch (error) {
      this.logger.error(`Error emitting chat update: ${error.message}`);
    }
  }

  // Method to emit message delivery status
  async emitMessageDelivered(orderId: string, messageId: string) {
    try {
      this.server.to(`order_${orderId}`).emit('messageDelivered', { messageId });
    } catch (error) {
      this.logger.error(`Error emitting message delivery: ${error.message}`);
    }
  }

  // Method to emit message read status
  async emitMessageRead(orderId: string, messageId: string) {
    try {
      this.server.to(`order_${orderId}`).emit('messageRead', { messageId });
    } catch (error) {
      this.logger.error(`Error emitting message read status: ${error.message}`);
    }
  }
} 