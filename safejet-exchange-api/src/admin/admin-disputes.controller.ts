import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus, Param, Logger, Put, Res } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PDispute, DisputeStatus, DisputeProgressItem } from '../p2p/entities/p2p-dispute.entity';
import { P2PDisputeMessage, DisputeMessageSenderType } from '../p2p/entities/p2p-dispute-message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { EmailService } from '../email/email.service';
import { P2PDisputeGateway } from '../p2p/gateways/p2p-dispute.gateway';

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
    private disputeMessageRepository: Repository<P2PDisputeMessage>,
    private readonly emailService: EmailService,
    private readonly disputeGateway: P2PDisputeGateway
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
      this.logger.log(`Fetching dispute details for ID: ${id}`);
      
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
        this.logger.error(`Dispute not found with ID: ${id}`);
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Raw dispute from database: ${JSON.stringify({
        id: dispute.id,
        status: dispute.status,
        statusType: typeof dispute.status,
        progressHistory: dispute.progressHistory ? dispute.progressHistory.length : 0,
      })}`);

      // Fetch messages separately with sender information
      const messages = await this.disputeMessageRepository.find({
        where: { disputeId: id },
        relations: ['sender'],
        order: { createdAt: 'ASC' }
      });

      // Ensure status is a valid DisputeStatus enum value
      if (dispute.status) {
        this.logger.log(`Original status before processing: "${dispute.status}"`);
        
        // The enum values are lowercase in the DisputeStatus definition
        const lowercaseStatus = dispute.status.toLowerCase();
        this.logger.log(`Lowercase status for comparison: "${lowercaseStatus}"`);
        
        // Get all lowercase enum values for comparison
        const validLowercaseStatuses = Object.values(DisputeStatus).map(s => s.toLowerCase());
        this.logger.log(`Valid lowercase statuses: ${JSON.stringify(validLowercaseStatuses)}`);
        
        if (validLowercaseStatuses.includes(lowercaseStatus)) {
          this.logger.log(`Status "${lowercaseStatus}" is a valid DisputeStatus enum value`);
          // Use the original case from the enum to ensure consistency
          const originalCaseStatus = Object.values(DisputeStatus).find(
            s => s.toLowerCase() === lowercaseStatus
          );
          this.logger.log(`Setting status to enum value: "${originalCaseStatus}"`);
          dispute.status = originalCaseStatus;
        } else {
          this.logger.log(`Status "${lowercaseStatus}" is NOT a valid DisputeStatus enum value, defaulting to PENDING`);
          dispute.status = DisputeStatus.PENDING;
        }
      } else {
        this.logger.log('No status found, defaulting to PENDING');
        dispute.status = DisputeStatus.PENDING;
      }

      this.logger.log(`Final dispute status being returned: "${dispute.status}"`);
      this.logger.log(`DisputeStatus enum values: ${JSON.stringify(Object.values(DisputeStatus))}`);
      
      // Process progress history to resolve user IDs to names
      if (dispute.progressHistory && dispute.progressHistory.length > 0) {
        dispute.progressHistory = await Promise.all(dispute.progressHistory.map(async (entry) => {
          // If entry is already using "Admin", keep it
          if (entry.addedBy === 'Admin') {
            return entry;
          }
          
          try {
            // Check if the addedBy is a valid UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.addedBy);
            
            if (isUUID) {
              // Try to find the user
              const userRepo = this.disputeRepository.manager.getRepository('users');
              const user = await userRepo.findOne({
                where: { id: entry.addedBy }
              });
              
              if (user) {
                // Use user's full name or username
                entry.addedBy = user.fullName || user.username || 'User';
              } else if (entry.addedBy === dispute.initiatorId) {
                // If user not found but matches initiator ID
                entry.addedBy = dispute.initiator?.fullName || 'Initiator';
              } else if (entry.addedBy === dispute.respondentId) {
                // If user not found but matches respondent ID
                entry.addedBy = dispute.respondent?.fullName || 'Respondent';
              } else {
                // If we can't resolve the user but it's a UUID, show "User"
                entry.addedBy = 'User';
              }
            }
            
            return entry;
          } catch (error) {
            this.logger.error(`Error processing history entry: ${error.message}`);
            return entry;
          }
        }));
      }

      // Parse payment metadata
      let paymentMetadata: PaymentMetadata = {};
      let completePaymentDetails = null;
      
      try {
        // this.logger.log(`Original payment metadata type: ${typeof dispute.order.paymentMetadata}`);
        // this.logger.log(`Original payment metadata: ${JSON.stringify(dispute.order.paymentMetadata)}`);
        
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
            // this.logger.log(`Using object payment metadata: ${JSON.stringify(paymentMetadata)}`);
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
                // this.logger.log(`Found payment method: ${JSON.stringify(paymentMethod)}`);
                
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
                
                // this.logger.log(`Complete payment details: ${JSON.stringify(completePaymentDetails)}`);
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
                
                // this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
                
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
              
              // this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
              
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
            
            // this.logger.log(`Payment details after extraction: ${JSON.stringify(paymentDetails)}`);
            
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
      this.logger.log(`Attempting to update dispute status for ID: ${id} to ${dto.status}`);
      
      // First, ensure the input status is valid
      const validStatus = this.validateDisputeStatus(dto.status);
      this.logger.log(`Validated status: ${validStatus}`);
      
      const dispute = await this.disputeRepository.findOne({
        where: { id },
        relations: ['initiator', 'respondent', 'order', 'order.offer', 'order.offer.token']
      });

      if (!dispute) {
        this.logger.error(`Dispute not found with ID: ${id}`);
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Found dispute: ${dispute.id} with current status: ${dispute.status}`);
      
      // Get old status to check for status change
      const oldStatus = dispute.status?.toLowerCase();
      this.logger.log(`Old status (normalized to lowercase): ${oldStatus}`);
      
      // Use the validated status
      dispute.status = validStatus;
      this.logger.log(`Updated status in dispute object: ${dispute.status}`);
      
      // If resolution statuses, set resolvedAt
      if (validStatus.includes('resolved') || validStatus === 'closed') {
        dispute.resolvedAt = new Date();
        this.logger.log(`Set resolvedAt to ${dispute.resolvedAt}`);
      }

      // Create an appropriate history entry based on the status change
      let historyEntry: DisputeProgressItem;
      
      if (oldStatus === 'pending' && validStatus === 'in_progress') {
        // Admin is joining the dispute
        historyEntry = {
          title: 'Admin Joined',
          details: 'Admin joined the dispute',
          timestamp: new Date().toISOString(),
          addedBy: 'Admin'
        };
      } else {
        // Get formatted status for the message
        const formattedStatus = this.formatStatus(validStatus);
        
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
      this.logger.log(`Added history entry: ${JSON.stringify(historyEntry)}`);
      this.logger.log(`Progress history now has ${dispute.progressHistory.length} entries`);
      
      // Save the updated dispute to the database
      this.logger.log(`Attempting to save dispute with updated status: ${dispute.status}`);
      try {
        const savedDispute = await this.disputeRepository.save(dispute);
        this.logger.log(`Dispute saved successfully with status: ${savedDispute.status}`);
        
        // Verify the save worked by fetching it again
        const verifyDispute = await this.disputeRepository.findOne({
          where: { id },
        });
        
        if (verifyDispute) {
          this.logger.log(`Verification fetch - Dispute ${id} now has status: ${verifyDispute.status}`);
        } else {
          this.logger.error(`Verification failed - Could not find dispute ${id} after save`);
        }
      } catch (saveError) {
        this.logger.error(`Error saving dispute: ${saveError.message}`);
        this.logger.error(`Save error stack: ${saveError.stack}`);
        throw saveError;
      }
      
      // Add a system message to the dispute chat
      try {
        let systemMessage = '';
        
        if (oldStatus === 'pending' && validStatus === 'in_progress') {
          systemMessage = 'Admin has joined the dispute';
        } else if (validStatus.includes('resolved')) {
          systemMessage = `Dispute has been resolved with status: ${this.formatStatus(validStatus)}`;
        } else if (validStatus === 'closed') {
          systemMessage = 'Dispute has been closed';
        } else {
          systemMessage = `Dispute status changed to ${this.formatStatus(validStatus)}`;
        }
        
        const disputeMessage = this.disputeMessageRepository.create({
          disputeId: id,
          senderId: null, // null sender indicates system message
          senderType: DisputeMessageSenderType.SYSTEM,
          message: systemMessage,
          isRead: false,
          isDelivered: true
        });
        
        // Save the message
        const savedMessage = await this.disputeMessageRepository.save(disputeMessage);
        
        // Emit real-time update
        await this.disputeGateway.emitDisputeMessageUpdate(id, savedMessage);
        
        // Also emit dispute status update
        await this.disputeGateway.emitDisputeStatusUpdate(id, validStatus);
        
        // Emit full dispute update for comprehensive UI refresh
        await this.disputeGateway.emitDisputeUpdate(id, dispute);
        
        this.logger.log(`System message added for dispute ${id} and broadcasted: ${systemMessage}`);
      } catch (messageError) {
        // Log the error but don't fail the status update if message creation fails
        this.logger.error(`Error creating system message: ${messageError.message}`, messageError);
      }
      
      // Send email notifications to both users
      try {
        // Prepare email data
        const formattedStatus = this.formatStatus(validStatus);
        const trackingId = dispute.order?.trackingId || 'N/A';
        const amount = dispute.order?.assetAmount?.toString() || 'N/A';
        const tokenSymbol = dispute.order?.offer?.token?.symbol || 'N/A';
        const currency = dispute.order?.offer?.currency || 'N/A';
        
        // Determine email subject and content based on status change
        let statusDetails = `Status changed to ${formattedStatus}`;
        
        if (oldStatus === 'pending' && validStatus === 'in_progress') {
          statusDetails = 'An admin has joined your dispute and will assist in the resolution process.';
        } else if (validStatus.includes('resolved')) {
          statusDetails = `Your dispute has been resolved with status: ${formattedStatus}`;
        } else if (validStatus === 'closed') {
          statusDetails = 'Your dispute has been closed.';
        }
        
        // Send email to initiator
        if (dispute.initiator?.email) {
          await this.emailService.sendP2PDisputeStatusUpdateEmail(
            dispute.initiator.email,
            dispute.initiator.fullName || 'User',
            trackingId,
            amount,
            tokenSymbol,
            currency,
            formattedStatus,
            statusDetails
          );
          this.logger.log(`Dispute status change email sent to initiator: ${dispute.initiator.email}`);
        }
        
        // Send email to respondent
        if (dispute.respondent?.email) {
          await this.emailService.sendP2PDisputeStatusUpdateEmail(
            dispute.respondent.email,
            dispute.respondent.fullName || 'User',
            trackingId,
            amount,
            tokenSymbol,
            currency,
            formattedStatus,
            statusDetails
          );
          this.logger.log(`Dispute status change email sent to respondent: ${dispute.respondent.email}`);
        }
      } catch (emailError) {
        // Log the error but don't fail the status update if emails fail
        this.logger.error(`Error sending dispute status change emails: ${emailError.message}`, emailError);
      }

      return { message: 'Status updated successfully' };
    } catch (error) {
      this.logger.error(`Error updating dispute ${id} status:`, error);
      throw new HttpException(
        error.message || 'Failed to update status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validates the dispute status and returns a proper DisputeStatus enum value
   * @param status Status to validate
   * @returns A valid DisputeStatus enum value
   */
  private validateDisputeStatus(status: string): DisputeStatus {
    this.logger.log(`Validating status: ${status}`);
    
    if (!status) {
      this.logger.log('No status provided, defaulting to PENDING');
      return DisputeStatus.PENDING;
    }
    
    // Normalize to lowercase for comparison
    const lowercaseStatus = status.toLowerCase();
    this.logger.log(`Normalized to lowercase: ${lowercaseStatus}`);
    
    // Get all valid enum values (in lowercase for comparison)
    const validStatuses = Object.values(DisputeStatus).map(s => s.toLowerCase());
    
    // Check if the lowercase version matches any valid enum value
    if (validStatuses.includes(lowercaseStatus)) {
      // Find the original case version from the enum
      const originalCaseStatus = Object.values(DisputeStatus).find(
        s => s.toLowerCase() === lowercaseStatus
      );
      
      this.logger.log(`Found matching enum value: ${originalCaseStatus}`);
      return originalCaseStatus as DisputeStatus;
    }
    
    this.logger.log(`Invalid status: ${status}, defaulting to PENDING`);
    return DisputeStatus.PENDING;
  }

  @Post('disputes/:id/message')
  async sendDisputeMessage(
    @Param('id') disputeId: string,
    @Body() dto: any, // Change to 'any' to handle FormData
    @GetUser() admin: User
  ) {
    try {
      // Extract the message from the request body
      let message = '';
      let attachment = null;
      
      // Handle both JSON body and FormData requests
      if (dto.message !== undefined) {
        message = dto.message;
      } else if (typeof dto === 'object') {
        // Log the entire body for debugging
        this.logger.log(`Message DTO: ${JSON.stringify(dto)}`);
      }

      // Extract attachment if available (whether in FormData or JSON)
      if (dto.attachment !== undefined) {
        attachment = dto.attachment;
        this.logger.log('Attachment found in request');
      }
      
      // Validate message input
      if (!message || message.trim() === '') {
        this.logger.error('Cannot send empty message');
        throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
      }

      const dispute = await this.disputeRepository.findOne({
        where: { id: disputeId },
        relations: ['initiator', 'respondent', 'order']
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      // Log the incoming message for debugging
      this.logger.log(`Creating dispute message: { disputeId: ${disputeId}, message: ${message}, senderType: ADMIN }`);

      // Create dispute message with the extracted message
      const disputeMessage = this.disputeMessageRepository.create({
        disputeId,
        senderId: null, // Use null for senderId to avoid foreign key constraint error
        senderType: DisputeMessageSenderType.ADMIN,
        message: message.trim(), // Ensure the message is not empty and trim whitespace
        isRead: false,
        isDelivered: false
      });

      // Check for attachments
      if (attachment) {
        // If the attachment is a base64 string, save it
        if (typeof attachment === 'string' && attachment.startsWith('data:')) {
          // Extract MIME type and base64 content
          const matches = attachment.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Generate a unique filename
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${this.getExtensionFromMimeType(mimeType)}`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
            
            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, filename);
            
            // Save the file
            fs.writeFileSync(filePath, buffer);
            this.logger.log(`Saved attachment to ${filePath}`);
            
            // Update message with attachment details - save ONLY the filename, no path
            disputeMessage.attachmentUrl = filename;
            disputeMessage.attachmentType = mimeType;
            
            this.logger.log(`Set attachment filename to ${disputeMessage.attachmentUrl}`);
          } else {
            this.logger.error('Invalid base64 attachment format');
          }
        }
      }

      // Save the message
      const savedMessage = await this.disputeMessageRepository.save(disputeMessage);
      this.logger.log(`Message saved successfully with id: ${savedMessage.id}`);
      
      // Emit real-time update through WebSocket
      await this.disputeGateway.emitDisputeMessageUpdate(disputeId, savedMessage);
      
      // No longer adding to dispute progress history when sending messages
      
      // Notify both users via email about the new message
      try {
        if (dispute.initiator?.email && dispute.initiator?.id !== admin.id) {
          this.emailService.sendP2PNewMessageEmail(
            dispute.initiator.email,
            dispute.initiator.fullName || 'User',
            dispute.order?.trackingId || disputeId,
            true // isAdminMessage
          );
        }
        
        if (dispute.respondent?.email && dispute.respondent?.id !== admin.id) {
          this.emailService.sendP2PNewMessageEmail(
            dispute.respondent.email,
            dispute.respondent.fullName || 'User',
            dispute.order?.trackingId || disputeId,
            true // isAdminMessage
          );
        }
      } catch (emailError) {
        this.logger.error(`Error sending message notification emails: ${emailError.message}`, emailError);
      }

      return savedMessage;
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
    @Body() dto: { title: string; details: string; addedBy?: string },
    @GetUser() admin: User
  ) {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { id },
        relations: ['order']
      });

      if (!dispute) {
        throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
      }

      const historyEntry: DisputeProgressItem = {
        title: dto.title,
        details: dto.details,
        timestamp: new Date().toISOString(),
        addedBy: dto.addedBy || 'Admin'  // Use provided addedBy or default to Admin
      };

      this.logger.log(`Adding progress entry: ${JSON.stringify(historyEntry)}`);
      
      dispute.progressHistory = [...(dispute.progressHistory || []), historyEntry];
      await this.disputeRepository.save(dispute);

      // Create a system message for the history entry
      try {
        const systemMessage = `Progress Update - ${historyEntry.title}: ${historyEntry.details}`;
        
        const disputeMessage = this.disputeMessageRepository.create({
          disputeId: id,
          senderId: null, // null sender indicates system message
          senderType: DisputeMessageSenderType.SYSTEM,
          message: systemMessage,
          isRead: false,
          isDelivered: true
        });
        
        // Save the message
        const savedMessage = await this.disputeMessageRepository.save(disputeMessage);
        
        // Emit real-time updates
        await this.disputeGateway.emitDisputeMessageUpdate(id, savedMessage);
        await this.disputeGateway.emitDisputeUpdate(id, dispute);
        
        this.logger.log(`System message created for history entry: ${systemMessage}`);
      } catch (error) {
        this.logger.error(`Error creating system message for history entry: ${error.message}`, error);
        // Don't fail the whole request if message creation fails
      }

      return { message: 'Progress entry added successfully' };
    } catch (error) {
      this.logger.error(`Error adding progress entry to dispute ${id}:`, error);
      throw new HttpException(
        error.message || 'Failed to add progress entry',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private formatStatus(status: string): string {
    return status
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Helper to get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeExtMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
    };
    
    return mimeExtMap[mimeType] || 'dat';
  }
} 