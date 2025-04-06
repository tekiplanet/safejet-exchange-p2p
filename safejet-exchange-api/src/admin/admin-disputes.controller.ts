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
  typeName?: string;
  methodDetails?: Record<string, any>;
  userId?: string;
  methodName?: string;
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
        order: { createdAt: 'ASC' }
      });

      // Parse payment metadata
      let paymentMetadata: PaymentMetadata = {};
      let completePaymentDetails = null;
      
      try {
        this.logger.log(`Original payment metadata type: ${typeof dispute.order.paymentMetadata}`);
        this.logger.log(`Original payment metadata: ${JSON.stringify(dispute.order.paymentMetadata)}`);
        
        // Check if payment metadata is already an object or needs parsing
        if (dispute.order.paymentMetadata) {
          if (typeof dispute.order.paymentMetadata === 'string') {
            try {
              paymentMetadata = JSON.parse(dispute.order.paymentMetadata) as PaymentMetadata;
              this.logger.log(`Parsed payment metadata: ${JSON.stringify(paymentMetadata)}`);
            } catch (parseError) {
              this.logger.error(`Error parsing payment metadata: ${parseError.message}`);
              // If can't parse, use as is or set default
              paymentMetadata = { methodType: dispute.order.paymentMetadata || 'Unknown' };
            }
          } else {
            // It's already an object
            paymentMetadata = dispute.order.paymentMetadata as PaymentMetadata;
            this.logger.log(`Using object payment metadata: ${JSON.stringify(paymentMetadata)}`);
          }
          
          const methodId = paymentMetadata.methodId;
          
          if (methodId) {
            // Fetch the actual payment method details from the database
            try {
              // Similar to how it's done in p2p.service.ts
              const paymentMethodRepo = this.disputeRepository.manager.getRepository('payment_methods');
              const paymentMethod = await paymentMethodRepo.findOne({
                where: { id: methodId },
                relations: ['paymentMethodType'],
              });
              
              if (paymentMethod) {
                this.logger.log(`Found payment method: ${JSON.stringify(paymentMethod)}`);
                
                // Get the payment method fields for this payment method type
                const paymentMethodFieldRepo = this.disputeRepository.manager.getRepository('payment_method_fields');
                const paymentMethodFields = await paymentMethodFieldRepo.find({
                  where: { paymentMethodTypeId: paymentMethod.paymentMethodTypeId },
                  order: { order: 'ASC' },
                });
                
                // Parse the details JSON
                let details = {};
                try {
                  details = typeof paymentMethod.details === 'string' 
                    ? JSON.parse(paymentMethod.details) 
                    : paymentMethod.details;
                } catch (error) {
                  this.logger.error('Error parsing payment method details:', error);
                }
                
                // Format payment details in a user-friendly way
                completePaymentDetails = {
                  id: paymentMethod.id,
                  name: paymentMethod.name || '',
                  details: details,
                  paymentMethodType: {
                    id: paymentMethod.paymentMethodType.id,
                    name: paymentMethod.paymentMethodType.name,
                    icon: paymentMethod.paymentMethodType.icon || 'payment'
                  },
                  fields: paymentMethodFields
                };
                
                this.logger.log(`Complete payment details: ${JSON.stringify(completePaymentDetails)}`);
              } else {
                this.logger.warn(`Payment method not found for ID: ${methodId}`);
                // Fallback to extracted details
                const methodName = paymentMetadata.methodType || paymentMetadata.typeName || 'Payment Method';
                let paymentDetails = {};
                
                if (paymentMetadata.details) {
                  paymentDetails = paymentMetadata.details;
                } else {
                  // Extract any fields that might be payment details
                  const knownFields = ['methodId', 'methodType', 'icon', 'name', 'typeName', 'userId'];
                  paymentDetails = Object.entries(paymentMetadata)
                    .filter(([key]) => !knownFields.includes(key))
                    .reduce((obj, [key, value]) => {
                      obj[key] = value;
                      return obj;
                    }, {});
                }
                
                this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
                
                completePaymentDetails = {
                  name: paymentMetadata.methodName || paymentMetadata.name || '',
                  details: paymentDetails,
                  paymentMethodType: {
                    name: methodName,
                    icon: paymentMetadata.icon || 'payment'
                  }
                };
              }
            } catch (error) {
              this.logger.error(`Error fetching payment method: ${error.message}`);
              // Fallback to basic extraction
              const methodName = paymentMetadata.methodType || paymentMetadata.typeName || 'Payment Method';
              let paymentDetails = {};
              
              if (paymentMetadata.details) {
                paymentDetails = paymentMetadata.details;
              } else {
                // Extract any fields that might be payment details
                const knownFields = ['methodId', 'methodType', 'icon', 'name', 'typeName', 'userId'];
                paymentDetails = Object.entries(paymentMetadata)
                  .filter(([key]) => !knownFields.includes(key))
                  .reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                  }, {});
              }
              
              this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
              
              completePaymentDetails = {
                name: paymentMetadata.methodName || paymentMetadata.name || '',
                details: paymentDetails,
                paymentMethodType: {
                  name: methodName,
                  icon: paymentMetadata.icon || 'payment'
                }
              };
            }
          } else {
            // If no methodId, extract details from metadata
            const methodName = paymentMetadata.methodType || paymentMetadata.typeName || 'Payment Method';
            let paymentDetails = {};
            
            if (paymentMetadata.details) {
              paymentDetails = paymentMetadata.details;
            } else {
              // Extract any fields that might be payment details
              const knownFields = ['methodId', 'methodType', 'icon', 'name', 'typeName', 'userId'];
              paymentDetails = Object.entries(paymentMetadata)
                .filter(([key]) => !knownFields.includes(key))
                .reduce((obj, [key, value]) => {
                  obj[key] = value;
                  return obj;
                }, {});
            }
            
            this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
            
            completePaymentDetails = {
              name: paymentMetadata.methodName || paymentMetadata.name || '',
              details: paymentDetails,
              paymentMethodType: {
                name: methodName,
                icon: paymentMetadata.icon || 'payment'
              }
            };
          }
        }
      } catch (e) {
        this.logger.error(`Error handling payment metadata: ${e.message}`, e);
        paymentMetadata = { methodType: 'Unknown' };
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
          paymentMethod: completePaymentDetails?.paymentMethodType?.name || paymentMetadata.methodType || paymentMetadata.typeName || 'Unknown',
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