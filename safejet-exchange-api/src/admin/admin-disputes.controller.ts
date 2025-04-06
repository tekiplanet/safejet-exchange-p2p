import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus, Param, Logger, Put } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PDispute, DisputeStatus, DisputeProgressItem } from '../p2p/entities/p2p-dispute.entity';
import { P2PDisputeMessage } from '../p2p/entities/p2p-dispute-message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';

interface PaymentMetadata {
  methodId?: string;
  methodType?: string;
  name?: string;
  details?: Record<string, any>;
  icon?: string;
}

interface ProgressHistoryEntry {
  title: string;
  addedBy: string;
  details: string;
  timestamp: string;
}

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDisputesController {
  private readonly logger = new Logger(AdminDisputesController.name);

  constructor(
    @InjectRepository(P2PDispute)
    private disputeRepository: Repository<P2PDispute>,
    @InjectRepository(P2PDisputeMessage)
    private disputeMessageRepository: Repository<P2PDisputeMessage>
  ) {}

  @Get()
  async getAllDisputes() {
    try {
      const disputes = await this.disputeRepository.find({
        relations: ['initiator', 'respondent', 'order'],
        order: { createdAt: 'DESC' }
      });

      return disputes;
    } catch (error) {
      this.logger.error('Error fetching disputes:', error);
      throw new HttpException(
        'Failed to fetch disputes',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getDisputeById(@Param('id') id: string) {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { id },
        relations: [
          'initiator',
          'respondent',
          'order',
          'order.buyer',
          'order.seller',
          'order.offer',
          'order.offer.token'
        ]
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      // Fetch messages separately with sender information
      const messages = await this.disputeMessageRepository.find({
        where: { disputeId: id },
        relations: ['sender'],
        order: { createdAt: 'DESC' }
      });

      // Parse payment metadata
      let paymentMetadata: PaymentMetadata = {};
      let completePaymentDetails = null;
      
      try {
        paymentMetadata = JSON.parse(dispute.order.paymentMetadata) as PaymentMetadata;
        if (paymentMetadata.methodId) {
          // TODO: Fetch complete payment method details from payment service
          // For now, we'll use the basic payment metadata
          completePaymentDetails = {
            name: paymentMetadata.name || '',
            details: paymentMetadata.details || {},
            paymentMethodType: {
              name: paymentMetadata.methodType || 'Payment Method',
              icon: paymentMetadata.icon || 'payment'
            }
          };
        }
      } catch (e) {
        this.logger.error('Error parsing payment metadata:', e);
      }

      // Transform the data to match the frontend interface
      const transformedDispute = {
        ...dispute,
        messages,
        order: {
          ...dispute.order,
          trackingId: dispute.order.trackingId,
          amount: Number(dispute.order.currencyAmount),
          assetAmount: Number(dispute.order.assetAmount),
          price: Number(dispute.order.price || dispute.order.offer.price),
          currency: dispute.order.offer.currency,
          cryptoAsset: dispute.order.offer.token.symbol,
          status: dispute.order.buyerStatus, // Using buyer status as main status
          buyerStatus: dispute.order.buyerStatus,
          sellerStatus: dispute.order.sellerStatus,
          paymentMethod: paymentMetadata.methodType || 'Unknown',
          paymentMetadata,
          completePaymentDetails,
          buyer: {
            fullName: dispute.order.buyer.fullName,
            email: dispute.order.buyer.email
          },
          seller: {
            fullName: dispute.order.seller.fullName,
            email: dispute.order.seller.email
          },
          createdAt: dispute.order.createdAt.toISOString()
        }
      };

      return transformedDispute;
    } catch (error) {
      this.logger.error(`Error fetching dispute ${id}:`, error);
      throw new HttpException(
        error.message || 'Failed to fetch dispute',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id/status')
  async updateDisputeStatus(
    @Param('id') id: string,
    @Body() dto: { status: DisputeStatus },
    @GetUser() admin: User
  ) {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { id },
        relations: ['initiator', 'respondent']
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      dispute.status = dto.status;
      if (dto.status === DisputeStatus.RESOLVED_BUYER || dto.status === DisputeStatus.RESOLVED_SELLER || dto.status === DisputeStatus.CLOSED) {
        dispute.resolvedAt = new Date();
      }

      const historyEntry: DisputeProgressItem = {
        title: 'Status Updated',
        details: `Status changed to ${dto.status}`,
        timestamp: new Date().toISOString(),
        addedBy: admin.email
      };

      dispute.progressHistory = [...(dispute.progressHistory || []), historyEntry];
      await this.disputeRepository.save(dispute);

      return { message: 'Status updated successfully' };
    } catch (error) {
      this.logger.error(`Error updating dispute ${id} status:`, error);
      throw new HttpException(
        error.message || 'Failed to update status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/message')
  async sendDisputeMessage(
    @Param('id') disputeId: string,
    @Body() dto: { message: string },
    @GetUser() admin: User
  ) {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { id: disputeId },
        relations: ['initiator', 'respondent']
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      const message = this.disputeMessageRepository.create({
        disputeId,
        senderId: admin.id,
        message: dto.message
      });

      const historyEntry: DisputeProgressItem = {
        title: 'Message Sent',
        details: dto.message,
        timestamp: new Date().toISOString(),
        addedBy: admin.email
      };

      dispute.progressHistory = [...(dispute.progressHistory || []), historyEntry];
      await this.disputeRepository.save(dispute);

      return this.disputeMessageRepository.save(message);
    } catch (error) {
      this.logger.error('Error sending dispute message:', error);
      throw new HttpException(
        error.message || 'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 