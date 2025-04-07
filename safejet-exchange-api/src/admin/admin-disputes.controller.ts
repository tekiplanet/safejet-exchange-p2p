import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus, Param, Logger, Put, Res } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PDispute, DisputeStatus, DisputeProgressItem } from '../p2p/entities/p2p-dispute.entity';
import { P2PDisputeMessage } from '../p2p/entities/p2p-dispute-message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

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

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDisputesController {
  private readonly logger = new Logger(AdminDisputesController.name);

  constructor(
    @InjectRepository(P2PDispute)
    private disputeRepository: Repository<P2PDispute>,
    @InjectRepository(P2PDisputeMessage)
    private disputeMessageRepository: Repository<P2PDisputeMessage>
  ) {}

  @Get('disputes')
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

  @Get('disputes/:id')
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

      // Ensure status is a valid DisputeStatus enum value
      if (dispute.status) {
        const upperStatus = dispute.status.toUpperCase();
        if (Object.values(DisputeStatus).includes(upperStatus as DisputeStatus)) {
          dispute.status = upperStatus as DisputeStatus;
        } else {
          dispute.status = DisputeStatus.PENDING;
        }
      } else {
        dispute.status = DisputeStatus.PENDING;
      }

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
        status: dispute.status,  // Now properly typed as DisputeStatus
        order: {
          ...dispute.order,
          trackingId: dispute.order.trackingId,
          amount: Number(dispute.order.currencyAmount),
          assetAmount: Number(dispute.order.assetAmount),
          price: Number(dispute.order.price || dispute.order.offer.price),
          currency: dispute.order.offer.currency,
          cryptoAsset: dispute.order.offer.token.symbol,
          status: (dispute.order.buyerStatus || '').toUpperCase(), // Ensure uppercase
          buyerStatus: (dispute.order.buyerStatus || '').toUpperCase(),
          sellerStatus: (dispute.order.sellerStatus || '').toUpperCase(),
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

  @Put('disputes/:id/status')
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

      // Get old status to check for status change
      const oldStatus = dispute.status?.toLowerCase();
      
      // Format the status for display
      const formatStatus = (status: string): string => {
        return status
          .toLowerCase()
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };
      
      // Convert status to lowercase for database
      const newStatus = dto.status.toLowerCase();
      
      // Update the status (store as lowercase)
      dispute.status = newStatus as DisputeStatus;
      
      // If resolution statuses, set resolvedAt
      if (newStatus.includes('resolved') || newStatus === 'closed') {
        dispute.resolvedAt = new Date();
      }

      // Create an appropriate history entry based on the status change
      let historyEntry: DisputeProgressItem;
      
      if (oldStatus === 'pending' && newStatus === 'in_progress') {
        // Admin is joining the dispute
        historyEntry = {
          title: 'Admin Joined',
          details: 'Admin joined the dispute',
          timestamp: new Date().toISOString(),
          addedBy: 'Admin'
        };
      } else {
        // Get formatted status for the message
        const formattedStatus = formatStatus(newStatus);
        
        // Generic status update
        historyEntry = {
          title: 'Status Updated',
          details: `Status changed to ${formattedStatus}`,
          timestamp: new Date().toISOString(),
          addedBy: 'Admin'
        };
      }

      // Add the history entry
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

  @Post('disputes/:id/message')
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
        addedBy: 'Admin'
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

  @Get('p2p/chat/images/:filename')
  async getChatImage(
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    try {
      // Correct path to public/uploads/chat where images are actually stored
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
      const filePath = path.join(uploadDir, filename);

      this.logger.log(`Attempting to serve image from: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.logger.error(`Image not found: ${filePath}`);
        throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
      }

      // Get file mime type
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';

      // Set proper content type and send file
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      this.logger.log(`Successfully serving image: ${filename}`);
    } catch (error) {
      this.logger.error(`Error serving chat image ${filename}:`, error);
      throw new HttpException(
        'Failed to serve image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('disputes/:id/progress')
  async addDisputeProgress(
    @Param('id') id: string,
    @Body() dto: { title: string; details: string },
    @GetUser() admin: User
  ) {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { id }
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      const historyEntry: DisputeProgressItem = {
        title: dto.title,
        details: dto.details,
        timestamp: new Date().toISOString(),
        addedBy: 'Admin'
      };

      dispute.progressHistory = [...(dispute.progressHistory || []), historyEntry];
      await this.disputeRepository.save(dispute);

      return { message: 'Progress entry added successfully' };
    } catch (error) {
      this.logger.error(`Error adding progress entry to dispute ${id}:`, error);
      throw new HttpException(
        error.message || 'Failed to add progress entry',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 