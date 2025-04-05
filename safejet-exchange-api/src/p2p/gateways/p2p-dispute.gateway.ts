import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { P2PDisputeMessage } from '../entities/p2p-dispute-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PDispute } from '../entities/p2p-dispute.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway({
  namespace: 'p2p/dispute',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class P2PDisputeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(P2PDisputeGateway.name);
  private connectedClients = new Map<string, string>(); // userId -> socketId

  @WebSocketServer()
  server: Server;

  private disputeRooms = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(P2PDisputeMessage)
    private readonly disputeMessageRepository: Repository<P2PDisputeMessage>,
    @InjectRepository(P2PDispute)
    private readonly disputeRepository: Repository<P2PDispute>,
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
      this.logger.log(`Dispute client connected: ${userId}`);

      // Join user's room for private messages
      client.join(`user_${userId}`);
      this.logger.debug(`Client joined user room: user_${userId}`);

      // Join rooms for all disputes where user is initiator or respondent
      const userDisputes = await this.disputeRepository.find({
        where: [
          { initiatorId: userId },
          { respondentId: userId },
          { adminId: userId },
        ],
      });

      userDisputes.forEach(dispute => {
        client.join(`dispute_${dispute.id}`);
        this.logger.debug(`Client joined dispute room: dispute_${dispute.id}`);
      });

    } catch (error) {
      this.logger.error('Dispute connection error:', error);
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
        this.logger.log(`Dispute client disconnected: ${userId}`);
        this.logger.debug(`Total connected clients: ${this.connectedClients.size}`);
        break;
      }
    }

    // Remove client from tracked rooms
    this.disputeRooms.forEach((clients, disputeId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.logger.debug(`Client removed from dispute room: ${disputeId}`);
        if (clients.size === 0) {
          this.disputeRooms.delete(disputeId);
          this.logger.debug(`Dispute room deleted: ${disputeId}`);
        }
      }
    });
  }

  @SubscribeMessage('joinDispute')
  async handleJoinDispute(client: Socket, data: { disputeId: string }) {
    try {
      const { disputeId } = data;
      this.logger.debug(`Client ${client.id} joining dispute room: ${disputeId}`);
      
      // Get user ID from connected clients
      let userId: string | undefined;
      for (const [uid, socketId] of this.connectedClients.entries()) {
        if (socketId === client.id) {
          userId = uid;
          break;
        }
      }
      
      if (!userId) {
        this.logger.error(`User not found for client ${client.id}`);
        return { error: 'User not authenticated' };
      }
      
      // Check if user is authorized to join this dispute room
      const dispute = await this.disputeRepository.findOne({
        where: { id: disputeId },
      });

      if (!dispute) {
        this.logger.error(`Dispute not found: ${disputeId}`);
        return { error: 'Dispute not found' };
      }

      if (
        dispute.initiatorId !== userId &&
        dispute.respondentId !== userId &&
        dispute.adminId !== userId
      ) {
        this.logger.error(`User ${userId} not authorized to join dispute ${disputeId}`);
        return { error: 'Not authorized to join this dispute' };
      }

      client.join(`dispute_${disputeId}`);
      
      // Track clients in room
      if (!this.disputeRooms.has(disputeId)) {
        this.disputeRooms.set(disputeId, new Set());
      }
      this.disputeRooms.get(disputeId).add(client.id);
      this.logger.debug(`Clients in room ${disputeId}: ${this.disputeRooms.get(disputeId).size}`);
      
      return { event: 'joinedDispute', disputeId };
    } catch (error) {
      this.logger.error('Error joining dispute room:', error);
      return { error: 'Failed to join dispute room' };
    }
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(
    @MessageBody() data: { messageId: string; disputeId: string }
  ) {
    try {
      this.logger.debug(`=== HANDLING MESSAGE DELIVERED ===`);
      this.logger.debug(`Message ID: ${data.messageId}`);
      this.logger.debug(`Dispute ID: ${data.disputeId}`);
      
      const message = await this.disputeMessageRepository.findOne({
        where: { id: data.messageId },
      });

      if (!message) {
        this.logger.error(`Message not found: ${data.messageId}`);
        return { error: 'Message not found' };
      }

      message.isDelivered = true;
      await this.disputeMessageRepository.save(message);
      
      this.logger.debug('Emitting delivery status to room');
      this.server.to(`dispute_${data.disputeId}`).emit('messageDelivered', {
        type: 'messageDelivered',
        disputeId: data.disputeId,
        messageId: data.messageId
      });
      this.logger.debug('Delivery status emitted successfully');
      
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking message as delivered:', error);
      return { error: 'Failed to mark message as delivered' };
    }
  }

  @SubscribeMessage('messageRead')
  async handleMessageRead(
    @MessageBody() data: { messageId: string; disputeId: string }
  ) {
    try {
      this.logger.debug(`=== HANDLING MESSAGE READ ===`);
      this.logger.debug(`Message ID: ${data.messageId}`);
      this.logger.debug(`Dispute ID: ${data.disputeId}`);
      
      const message = await this.disputeMessageRepository.findOne({
        where: { id: data.messageId },
      });

      if (!message) {
        this.logger.error(`Message not found: ${data.messageId}`);
        return { error: 'Message not found' };
      }

      message.isRead = true;
      await this.disputeMessageRepository.save(message);
      
      this.logger.debug('Emitting read status to room');
      this.server.to(`dispute_${data.disputeId}`).emit('messageRead', {
        type: 'messageRead',
        disputeId: data.disputeId,
        messageId: data.messageId
      });
      this.logger.debug('Read status emitted successfully');
      
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
      return { error: 'Failed to mark message as read' };
    }
  }

  // Method to emit dispute message updates
  async emitDisputeMessageUpdate(disputeId: string, message: P2PDisputeMessage) {
    try {
      this.logger.debug(`Emitting dispute update to room: dispute_${disputeId}`);
      this.logger.debug(`Message: ${JSON.stringify(message)}`);
      
      this.server.to(`dispute_${disputeId}`).emit('disputeMessageUpdate', {
        type: 'disputeMessageUpdate',
        disputeId,
        message,
      });
    } catch (error) {
      this.logger.error('Error emitting dispute message update:', error);
    }
  }

  // Method to emit dispute updates including progress history changes
  async emitDisputeUpdate(disputeId: string, dispute: P2PDispute) {
    try {
      this.logger.debug(`Emitting full dispute update to room: dispute_${disputeId}`);
      
      this.server.to(`dispute_${disputeId}`).emit('disputeUpdate', {
        type: 'disputeUpdate',
        disputeId,
        dispute,
      });
      
      // Also send to users directly
      if (dispute.initiatorId) {
        this.server.to(`user_${dispute.initiatorId}`).emit('disputeUpdate', {
          type: 'disputeUpdate',
          disputeId,
          dispute,
        });
      }
      
      if (dispute.respondentId) {
        this.server.to(`user_${dispute.respondentId}`).emit('disputeUpdate', {
          type: 'disputeUpdate',
          disputeId,
          dispute,
        });
      }
    } catch (error) {
      this.logger.error('Error emitting dispute update:', error);
    }
  }

  // Method to emit dispute status updates
  async emitDisputeStatusUpdate(disputeId: string, status: string) {
    try {
      this.logger.debug(`Emitting status update for dispute ${disputeId}: ${status}`);
      this.server.to(`dispute_${disputeId}`).emit('disputeStatusUpdate', {
        type: 'disputeStatusUpdate',
        disputeId,
        status
      });
      this.logger.debug('Status update emitted successfully');
    } catch (error) {
      this.logger.error(`Error emitting dispute status update: ${error.message}`);
      this.logger.error(error.stack);
    }
  }
} 