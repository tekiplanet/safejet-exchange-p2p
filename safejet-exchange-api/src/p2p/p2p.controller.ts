import { Controller, Get, Query, UseGuards, Post, Body, Param, Request, BadRequestException } from '@nestjs/common';
import { P2PService } from './p2p.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from '../auth/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

@Controller('p2p')
export class P2PController {
  constructor(private readonly p2pService: P2PService) {
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
    @Body() disputeData: { reason: string },
  ) {
    return this.p2pService.disputeOrder(trackingId, userId, disputeData.reason);
  }

  @Get('chat/:orderId/messages')
  @UseGuards(JwtAuthGuard)
  async getOrderMessages(@Param('orderId') orderId: string) {
    return this.p2pService.getOrderMessages(orderId);
  }

  @Post('chat/:orderId/message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() body: { message: string },
  ) {
    const order = await this.p2pService.getOrderByTrackingId(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new BadRequestException('Unauthorized to send message in this order');
    }

    return this.p2pService.createUserMessage(
      order.id,
      userId,
      body.message,
      isBuyer,
    );
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
} 