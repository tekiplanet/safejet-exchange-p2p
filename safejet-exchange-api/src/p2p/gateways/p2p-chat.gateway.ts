import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { P2PChatMessage } from '../entities/p2p-chat-message.entity';
import { ConfigService } from '@nestjs/config';
import { P2PService } from '../p2p.service';

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

  private orderRooms = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => P2PService))
    private p2pService: P2PService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      this.logger.debug(`Client attempting to connect with token: ${token.substring(0, 10)}...`);
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return;
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      this.logger.debug(`JWT Secret length: ${jwtSecret?.length}`);
      
      const decoded = this.jwtService.verify(token, {
        secret: jwtSecret
      });
      
      this.logger.debug('Token verified successfully');
      const userId = decoded.sub;

      this.logger.debug(`Client authenticated. UserID: ${userId}, SocketID: ${client.id}`);
      this.connectedClients.set(userId, client.id);
      this.logger.log(`Chat client connected: ${userId}`);

      // Join user's room for private messages
      client.join(`user_${userId}`);
      this.logger.debug(`Client joined user room: user_${userId}`);

      // Handle joining order chat room
      client.on('joinOrder', (orderId: string) => {
        this.logger.debug(`Client ${client.id} joining order room: ${orderId}`);
        client.join(`order_${orderId}`);
        this.logger.log(`Client joined order chat: ${orderId}`);
      });

    } catch (error) {
      this.logger.error('Chat connection error:', error);
      this.logger.error('Error stack:', error.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnecting: ${client.id}`);
    // Log socket state
    this.logger.debug(`Socket state: ${client.connected ? 'connected' : 'disconnected'}`);
    this.logger.debug(`Socket rooms: ${Array.from(client.rooms || []).join(', ')}`);
    
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(userId);
        this.logger.log(`Chat client disconnected: ${userId}`);
        this.logger.debug(`Total connected clients: ${this.connectedClients.size}`);
        break;
      }
    }

    // Remove client from tracked rooms
    this.orderRooms.forEach((clients, orderId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.debug(`Client removed from order room: ${orderId}`);
        if (clients.size === 0) {
          this.orderRooms.delete(orderId);
          this.logger.debug(`Order room deleted: ${orderId}`);
        }
      }
    });
  }

  // Method to emit chat updates
  async emitChatUpdate(orderId: string, message: P2PChatMessage) {
    try {
      this.logger.debug(`Emitting chat update to room: order_${orderId}`);
      this.logger.debug(`Message: ${JSON.stringify(message)}`);
      
      this.server.to(`order_${orderId}`).emit('chatUpdate', {
        type: 'chatUpdate',
        orderId,
        message
      });
      this.logger.debug('Chat update emitted successfully');
    } catch (error) {
      this.logger.error(`Error emitting chat update: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  // Method to emit message read status
  async emitMessageRead(orderId: string, messageId: string) {
    try {
      this.logger.debug(`Emitting read status for message ${messageId}`);
      this.server.to(`order_${orderId}`).emit('messageRead', {
        type: 'messageRead',
        orderId,
        messageId
      });
    } catch (error) {
      this.logger.error(`Error emitting message read status: ${error.message}`);
    }
  }

  // Method to emit message delivery status
  async emitMessageDelivered(orderId: string, messageId: string) {
    try {
      this.server.to(`order_${orderId}`).emit('messageDelivered', {
        type: 'messageDelivered',
        orderId,
        messageId
      });
    } catch (error) {
      this.logger.error(`Error emitting message delivery: ${error.message}`);
    }
  }

  @SubscribeMessage('messageRead')
  async handleMessageRead(
    @MessageBody() data: { messageId: string; orderId: string }
  ) {
    try {
      this.logger.debug(`Marking message ${data.messageId} as read`);
      await this.p2pService.markMessageAsRead(data.messageId);
      
      // Use the emitMessageRead method
      await this.emitMessageRead(data.orderId, data.messageId);
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
    }
  }

  @SubscribeMessage('joinOrder')
  handleJoinOrder(client: Socket, data: { orderId: string }) {
    const { orderId } = data;
    this.logger.debug(`Client ${client.id} joining order room: ${orderId}`);
    client.join(`order_${orderId}`);
    
    // Track clients in room
    if (!this.orderRooms.has(orderId)) {
      this.orderRooms.set(orderId, new Set());
    }
    this.orderRooms.get(orderId).add(client.id);
    this.logger.debug(`Clients in room ${orderId}: ${this.orderRooms.get(orderId).size}`);
    
    // Send acknowledgment back to client
    return { event: 'joinedOrder', orderId };
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @MessageBody() data: { messageId: string; orderId: string }
  ) {
    try {
      this.logger.debug(`Marking message ${data.messageId} as delivered`);
      // Update message in database
      await this.p2pService.markMessageAsDelivered(data.messageId);
      
      // Notify room about delivery
      this.server.to(`order_${data.orderId}`).emit('messageDelivered', {
        type: 'messageDelivered',
        orderId: data.orderId,
        messageId: data.messageId
      });
    } catch (error) {
      this.logger.error('Error marking message as delivered:', error);
    }
  }
}