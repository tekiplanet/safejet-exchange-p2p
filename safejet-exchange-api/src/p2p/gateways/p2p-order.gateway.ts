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
  namespace: 'p2p/orders/updates',
  cors: {
    origin: '*',  // For testing, we'll accept all origins
    credentials: true,
  },
  transports: ['websocket'],
})
export class P2POrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(P2POrderGateway.name);
  private connectedClients = new Map<string, string>(); // userId -> socketId

  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {
    this.logger.log('P2P WebSocket Gateway initialized');
    // Log the configuration
    this.logger.debug('Gateway configuration:', {
      namespace: 'p2p/orders/updates',
      cors: '*',
      transports: ['websocket']
    });
  }

  async handleConnection(client: Socket) {
    this.logger.debug('Connection attempt received', {
      headers: client.handshake.headers,
      query: client.handshake.query,
      url: client.handshake.url
    });
    
    try {
      // Get token from query parameter
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return;
      }

      // Log connection details for debugging
      this.logger.debug('Connection attempt details:', {
        headers: client.handshake.headers,
        query: client.handshake.query,
        url: client.handshake.url,
      });

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      this.connectedClients.set(userId, client.id);
      this.logger.log(`Client connected: ${userId}`);

      // Join a room specific to this user
      client.join(`user_${userId}`);

      // Handle room joining
      client.on('join', (data) => {
        if (data.orderId) {
          client.join(`order_${data.orderId}`);
          this.logger.log(`Client joined order room: ${data.orderId}`);
        }
      });

    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove client from tracking
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(userId);
        this.logger.log(`Client disconnected: ${userId}`);
        break;
      }
    }
  }

  // Method to emit order updates to relevant users
  async emitOrderUpdate(orderId: string, buyerId: string, sellerId: string, orderData: any) {
    try {
      // Emit to the specific order room
      this.server.to(`order_${orderId}`).emit('orderUpdate', {
        orderId,
        ...orderData
      });

      // Also emit to individual user rooms
      this.server.to(`user_${buyerId}`).emit('orderUpdate', {
        orderId,
        ...orderData
      });
      
      this.server.to(`user_${sellerId}`).emit('orderUpdate', {
        orderId,
        ...orderData
      });

      this.logger.log(`Order update emitted for order: ${orderId}`);
    } catch (error) {
      this.logger.error(`Error emitting order update: ${error.message}`);
    }
  }
} 