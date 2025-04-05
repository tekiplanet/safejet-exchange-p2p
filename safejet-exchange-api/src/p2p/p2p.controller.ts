import { Controller, Get, Query, UseGuards, Post, Body, Param, Request, BadRequestException, NotFoundException, Res } from '@nestjs/common';
import { P2PService } from './p2p.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from '../auth/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { Response } from 'express';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import { FileService } from '../common/services/file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { DisputeReasonType } from './entities/p2p-dispute.entity';

@Controller('p2p')
export class P2PController {
  constructor(
    private readonly p2pService: P2PService,
    private readonly fileService: FileService,
  ) {
    console.log('P2P Controller initialized');
  }

  @Get('available-assets')
  @UseGuards(JwtAuthGuard)
  async getAvailableAssets(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell'
  ) {
    return this.p2pService.getAvailableAssets(userId, type === 'buy');
  }

  @Get('trader-settings')
  @UseGuards(JwtAuthGuard)
  async getTraderSettings(@GetUser('id') userId: string) {
    console.log('Trader settings endpoint hit', { userId });
    return this.p2pService.getTraderSettings(userId);
  }

  @Get('market-price')
  async getMarketPrice(
    @Query('symbol') symbol: string,
    @Query('currency') currency: string,
  ) {
    console.log('Getting market price for:', { symbol, currency });
    const result = await this.p2pService.getMarketPrice(symbol, currency);
    console.log('Market price result:', result);
    return result;
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell'
  ) {
    try {
      console.log('Getting payment methods for user:', userId, 'type:', type);
      const result = await this.p2pService.getPaymentMethods(userId, type === 'buy');
      console.log('Payment methods result:', result);
      return result;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  @Post('offers')
  @UseGuards(JwtAuthGuard)
  async createOffer(
    @GetUser() user: User,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    // Check for existing active offer
    const existingOffer = await this.p2pService.getActiveOfferByUserAndToken(
      user.id,
      createOfferDto.tokenId,
      createOfferDto.isBuyOffer ? 'buy' : 'sell',
      createOfferDto.currency
    );

    if (existingOffer) {
      // Update existing offer
      const updatedOffer = await this.p2pService.updateOffer(
        existingOffer.id,
        createOfferDto
      );
      return {
        offer: updatedOffer,
        status: 'updated',
        message: 'Existing offer updated successfully',
      };
    }

    // Create new offer if none exists
    const newOffer = await this.p2pService.createOffer(user.id, createOfferDto);
    return {
      offer: newOffer,
      status: 'created',
      message: 'New offer created successfully',
    };
  }

  @Get('user-kyc-level')
  @UseGuards(JwtAuthGuard)
  async getUserKycLevel(@GetUser('id') userId: string) {
    return this.p2pService.getUserKycLevel(userId);
  }

  @Get('my-offers')
  @UseGuards(JwtAuthGuard)
  async getMyOffers(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell',
  ) {
    return this.p2pService.getMyOffers(userId, type === 'buy');
  }

  @Get('public-offers')
  @UseGuards(JwtAuthGuard)
  async getPublicOffers(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell',
    @Query('currency') currency?: string,
    @Query('tokenId') tokenId?: string,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('minAmount') minAmount?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.p2pService.getPublicOffers({
      type,
      currency,
      tokenId,
      paymentMethodId,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      page: page ? parseInt(page.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    }, userId);
  }

  @Get('currencies')
  async getActiveCurrencies() {
    return this.p2pService.getActiveCurrencies();
  }

  @Get('payment-method-types')
  async getActivePaymentMethodTypes() {
    return this.p2pService.getActivePaymentMethodTypes();
  }

  @Get('offer-details')
  @UseGuards(JwtAuthGuard)
  async getOfferDetails(@Query('offerId') offerId: string) {
    const offer = await this.p2pService.getOfferDetails(offerId);
    return offer;
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.p2pService.createOrder(createOrderDto);
  }

  @Get('orders/:trackingId')
  async getOrderByTrackingId(@Param('trackingId') trackingId: string) {
    return this.p2pService.getOrderByTrackingId(trackingId);
  }

  @Get('payment-methods/:id')
  async getPaymentMethodById(@Param('id') id: string) {
    return this.p2pService.getPaymentMethodById(id);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @GetUser('id') userId: string,
    @Query('type') type?: 'buy' | 'sell',
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Convert string parameters to numbers
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    return this.p2pService.getOrders({
      userId,
      type,
      status,
      search,
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Post('orders/by-tracking-id/:trackingId/confirm-payment')
  @UseGuards(JwtAuthGuard)
  async confirmOrderPayment(
    @Param('trackingId') trackingId: string,
    @GetUser('id') userId: string,
  ) {
    return this.p2pService.confirmOrderPayment(trackingId, userId);
  }

  @Post('orders/:trackingId/release')
  @UseGuards(JwtAuthGuard)
  async releaseOrder(
    @Param('trackingId') trackingId: string,
    @GetUser('id') userId: string,
  ) {
    return this.p2pService.releaseOrder(trackingId, userId);
  }

  @Post('orders/:trackingId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('trackingId') trackingId: string,
    @GetUser('id') userId: string,
  ) {
    return this.p2pService.cancelOrder(trackingId, userId);
  }

  @Post('orders/:trackingId/dispute')
  @UseGuards(JwtAuthGuard)
  async disputeOrder(
    @Param('trackingId') trackingId: string,
    @GetUser('id') userId: string,
    @Body() disputeData: { reason: string, reasonType?: string },
  ) {
    // If reasonType is provided, use the newer createDispute method
    if (disputeData.reasonType) {
      return this.p2pService.createDispute(
        trackingId,
        userId,
        disputeData.reasonType,
        disputeData.reason,
      );
    }
    // Otherwise fallback to the old method
    return this.p2pService.disputeOrder(trackingId, userId, disputeData.reason);
  }

  @Get('chat/:orderId/messages')
  @UseGuards(JwtAuthGuard)
  async getOrderMessages(@Param('orderId') orderId: string) {
    return this.p2pService.getOrderMessages(orderId);
  }

  @Post('chat/message/:messageId/delivered')
  @UseGuards(JwtAuthGuard)
  async markAsDelivered(@Param('messageId') messageId: string) {
    await this.p2pService.markMessageAsDelivered(messageId);
    return { success: true };
  }

  @Post('chat/message/:messageId/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('messageId') messageId: string) {
    await this.p2pService.markMessageAsRead(messageId);
    return { success: true };
  }

  @Post('orders/:trackingId/messages')
  @UseGuards(JwtAuthGuard)
  async createMessage(
    @Param('trackingId') trackingId: string,
    @Request() req,
    @Body() data: { message: string, attachment?: string }
  ) {
    const userId = req.user.id;
    return this.p2pService.createMessage(trackingId, userId, data.message, data.attachment);
  }

  @Get('chat/images/:filename')
  async serveChatImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filepath = this.fileService.getChatFilePath(filename);
      if (!fs.existsSync(filepath)) {
        throw new NotFoundException('Image not found');
      }

      const file = createReadStream(filepath);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'max-age=3600',
      });
      file.pipe(res);
    } catch (error) {
      throw new NotFoundException('Image not found');
    }
  }

  @Post('disputes/create/:trackingId')
  @UseGuards(JwtAuthGuard)
  async createDispute(
    @Param('trackingId') trackingId: string,
    @Body() body: { reasonType: string; reason: string; evidence?: any },
    @Request() req,
  ) {
    const userId = req.user.id;
    const { reasonType, reason, evidence } = body;

    // Validate reason type
    if (!Object.values(DisputeReasonType).includes(reasonType as DisputeReasonType)) {
      throw new BadRequestException('Invalid reason type');
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required');
    }

    return this.p2pService.createDispute(
      trackingId,
      userId,
      reasonType,
      reason,
      evidence,
    );
  }

  @Get('disputes/order/:trackingId')
  @UseGuards(JwtAuthGuard)
  async getDisputeByOrderId(
    @Param('trackingId') trackingId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    
    // First get the order ID from tracking ID
    const order = await this.p2pService.getOrderByTrackingId(trackingId);
    
    return this.p2pService.getDisputeByOrderId(order.id, userId);
  }

  @Get('disputes/:disputeId')
  @UseGuards(JwtAuthGuard)
  async getDisputeById(
    @Param('disputeId') disputeId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.p2pService.getDisputeById(disputeId, userId);
  }

  @Get('disputes/:disputeId/messages')
  @UseGuards(JwtAuthGuard)
  async getDisputeMessages(
    @Param('disputeId') disputeId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.p2pService.getDisputeMessages(disputeId, userId);
  }

  @Post('disputes/:disputeId/messages')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('attachment'))
  async sendDisputeMessage(
    @Param('disputeId') disputeId: string,
    @Body() body: { message: string },
    @UploadedFile() attachment,
    @Request() req,
  ) {
    const userId = req.user.id;
    const { message } = body;

    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    let attachmentData;
    if (attachment) {
      // Convert file buffer to base64 string
      attachmentData = `data:${attachment.mimetype};base64,${attachment.buffer.toString('base64')}`;
    }

    return this.p2pService.sendDisputeMessage(
      disputeId,
      userId,
      message,
      attachmentData,
    );
  }

  @Post('disputes/:disputeId/messages/:messageId/delivered')
  @UseGuards(JwtAuthGuard)
  async markDisputeMessageAsDelivered(
    @Param('disputeId') disputeId: string,
    @Param('messageId') messageId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    
    // Verify user has access to this dispute
    await this.p2pService.getDisputeById(disputeId, userId);
    
    await this.p2pService.markDisputeMessageAsDelivered(messageId);
    return { success: true };
  }

  @Post('disputes/:disputeId/messages/:messageId/read')
  @UseGuards(JwtAuthGuard)
  async markDisputeMessageAsRead(
    @Param('disputeId') disputeId: string,
    @Param('messageId') messageId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    
    // Verify user has access to this dispute
    await this.p2pService.getDisputeById(disputeId, userId);
    
    await this.p2pService.markDisputeMessageAsRead(messageId);
    return { success: true };
  }

  @Post('disputes/:disputeId/progress')
  @UseGuards(JwtAuthGuard)
  async addDisputeProgress(
    @Param('disputeId') disputeId: string,
    @Body() 
    progressData: { 
      title: string; 
      details: string; 
    },
    @GetUser('id') adminId: string,
  ) {
    return this.p2pService.addDisputeProgress(
      disputeId,
      progressData.title,
      progressData.details,
      adminId
    );
  }
} 