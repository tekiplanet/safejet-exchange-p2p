import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, In, Brackets } from 'typeorm';
import { P2POffer } from './entities/p2p-offer.entity';
import { P2PTraderSettings } from '../p2p-settings/entities/p2p-trader-settings.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Token } from '../wallet/entities/token.entity';
import { ExchangeRate } from '../exchange/exchange-rate.entity';
import { PaymentMethod } from '../payment-methods/entities/payment-method.entity';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from '../auth/entities/user.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { PaymentMethodField } from '../payment-methods/entities/payment-method-field.entity';
import { Dispute } from './entities/dispute.entity';
import { P2POrderGateway } from './gateways/p2p-order.gateway';
import { P2PChatMessage, MessageType } from './entities/p2p-chat-message.entity';
import { P2PChatGateway } from './gateways/p2p-chat.gateway';
import { FileService } from '../common/services/file.service';
import { P2PDispute, DisputeReasonType, DisputeStatus } from './entities/p2p-dispute.entity';
import { P2PDisputeMessage, DisputeMessageSenderType } from './entities/p2p-dispute-message.entity';
import { P2PDisputeGateway } from './gateways/p2p-dispute.gateway';

@Injectable()
export class P2PService {
  constructor(
    @InjectRepository(P2POffer)
    private readonly p2pOfferRepository: Repository<P2POffer>,
    @InjectRepository(P2PTraderSettings)
    private readonly p2pTraderSettingsRepository: Repository<P2PTraderSettings>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(PaymentMethodType)
    private readonly paymentMethodTypeRepository: Repository<PaymentMethodType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(KYCLevel)
    private readonly kycLevelRepository: Repository<KYCLevel>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    private readonly emailService: EmailService,
    @InjectRepository(PaymentMethodField)
    private readonly paymentMethodFieldRepository: Repository<PaymentMethodField>,
    private readonly orderGateway: P2POrderGateway,
    @InjectRepository(P2PChatMessage)
    private chatMessageRepository: Repository<P2PChatMessage>,
    @Inject(forwardRef(() => P2PChatGateway))
    private chatGateway: P2PChatGateway,
    private readonly fileService: FileService,
    @InjectRepository(P2PDispute)
    private readonly p2pDisputeRepository: Repository<P2PDispute>,
    @InjectRepository(P2PDisputeMessage)
    private readonly disputeMessageRepository: Repository<P2PDisputeMessage>,
    @Inject(forwardRef(() => P2PDisputeGateway))
    private disputeGateway: P2PDisputeGateway,
  ) {}

  async getAvailableAssets(userId: string, isBuyOffer: boolean) {
    try {
      // Get all active tokens first
      const allTokens = await this.tokenRepository
        .createQueryBuilder('token')
        .where('token.isActive = :isActive', { isActive: true })
        .getMany();

      // Group tokens by their base symbol
      const groupedTokens = allTokens.reduce((acc, token) => {
        const baseSymbol = token.symbol; // e.g., 'USDT' for both TRC20 and ERC20
        const metadata = token.metadata;
        const networks = metadata.networks || [];
        
        if (!acc[baseSymbol]) {
          // Use the first occurrence as the base token
          acc[baseSymbol] = {
            ...token,
            // Clean up name to remove network information
            name: token.name.split('(')[0].trim(), // e.g., "USDC Coin" instead of "USDC Coin (ERC20)"
            networks,
            fundingBalance: 0
          };
        } else {
          // Add networks to existing token's networks array
          acc[baseSymbol].networks = [...new Set([...acc[baseSymbol].networks, ...networks])];
        }
        return acc;
      }, {} as Record<string, any>);

      if (!isBuyOffer) {
        // For sell offers, get and sum funding balances
        const balances = await this.walletBalanceRepository
          .createQueryBuilder('balance')
          .where({ 
            userId,
            type: 'funding'
          })
          .getMany();

        // Sum balances for each token symbol
        for (const balance of balances) {
          if (balance.metadata?.networks) {
            const tokenId = Object.values(balance.metadata.networks)[0].tokenId;
            const token = allTokens.find(t => t.id === tokenId);
            
            if (token) {
              const baseSymbol = token.symbol;
              if (groupedTokens[baseSymbol]) {
                groupedTokens[baseSymbol].fundingBalance += parseFloat(balance.balance);
              }
            }
          }
        }

        // Filter out tokens with zero balance for sell offers
        let result = Object.values(groupedTokens).filter(token => token.fundingBalance > 0);

        // Sort alphabetically by symbol
        return result.sort((a, b) => a.symbol.localeCompare(b.symbol));
      }

      // For buy offers, return all unified tokens
      let result = Object.values(groupedTokens);

      // Sort alphabetically by symbol
      return result.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } catch (error) {
      console.error('Error in getAvailableAssets:', error);
      throw error;
    }
  }

  async getTraderSettings(userId: string) {
    let settings = await this.p2pTraderSettingsRepository.findOne({
      where: { userId }
    });

    if (!settings) {
      // Create new settings for the user
      settings = this.p2pTraderSettingsRepository.create({
        userId,
        // These will use the default values defined in the entity
      });
      await this.p2pTraderSettingsRepository.save(settings);
    }

    return settings;
  }

  async getMarketPrice(symbol: string, currency: string) {
    try {
      console.log('Getting market price for:', { symbol, currency });
      
      // Get token's USD price from Token table
      const token = await this.tokenRepository.findOne({
        where: { 
          symbol,
          isActive: true 
        },
        select: ['currentPrice', 'symbol', 'name']
      });

      console.log('Found token:', token);

      if (!token) {
        throw new NotFoundException(`Token ${symbol} not found`);
      }

      if (!currency || currency === 'USD') {
        const result = {
          price: token.currentPrice,
          lastUpdated: new Date(),
        };
        console.log('Returning USD price:', result);
        return result;
      }

      // Get currency rate (stored in lowercase)
      const currencyRate = await this.exchangeRateRepository.findOne({
        where: {
          currency: currency.toLowerCase()
        }
      });

      console.log('Found exchange rate:', currencyRate);

      if (!currencyRate) {
        throw new NotFoundException(`Exchange rate for ${currency} not found`);
      }

      const result = {
        price: token.currentPrice * currencyRate.rate,
        lastUpdated: currencyRate.lastUpdated,
      };
      console.log('Returning final price:', result);
      return result;
    } catch (error) {
      console.error('Error getting market price:', error);
      throw error;
    }
  }

  async getPaymentMethods(userId: string, isBuyOffer: boolean) {
    try {
      console.log('Getting payment methods with:', { userId, isBuyOffer });
      
      if (isBuyOffer) {
        // For buy offers, get all active payment method types
        const types = await this.paymentMethodTypeRepository.find({
          where: { isActive: true },
        });
        console.log('Found payment method types:', types);
        return types;
      } else {
        // For sell offers, get user's configured payment methods
        const methods = await this.paymentMethodRepository.find({
          where: { userId, isVerified: true },
          relations: ['paymentMethodType'],
        });
        console.log('Found payment methods:', methods);
        return methods;
      }
    } catch (error) {
      console.error('Error in getPaymentMethods:', error);
      throw error;
    }
  }

  async calculateOfferPrice(
    tokenId: string, 
    currency: string, 
    priceType: 'percentage' | 'fixed', 
    priceDelta: number,
    type: 'buy' | 'sell'
  ): Promise<{ price: number; priceUSD: number; marketPrice: number }> {
    try {
      const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
      if (!token) throw new NotFoundException('Token not found');

      // Get base price in USD
      const baseUsdPrice = Number(token.currentPrice);
      
      // Get currency exchange rate
      const exchangeRate = await this.exchangeRateRepository.findOne({
        where: { currency: currency.toLowerCase() }
      });
      if (!exchangeRate) throw new NotFoundException('Exchange rate not found');

      // Calculate market price in target currency
      const rate = Number(exchangeRate.rate);
      const marketPrice = baseUsdPrice * rate;

      // Calculate final price based on type and delta
      let finalPrice = 0;
      if (priceType === 'percentage') {
        const multiplier = type === 'sell' ? (1 + Number(priceDelta)/100) : (1 - Number(priceDelta)/100);
        finalPrice = marketPrice * multiplier;
      } else {
        finalPrice = type === 'sell' ? marketPrice + Number(priceDelta) : marketPrice - Number(priceDelta);
      }

      return {
        price: Number(finalPrice),
        priceUSD: Number(finalPrice / rate),
        marketPrice: marketPrice  // Return market price in target currency
      };
    } catch (error) {
      console.error('Error calculating offer price:', error);
      throw error;
    }
  }

  async createOffer(userId: string, createOfferDto: CreateOfferDto): Promise<P2POffer> {
    try {
      const calculatedPrice = await this.calculateOfferPrice(
        createOfferDto.tokenId,
        createOfferDto.currency,
        createOfferDto.priceType,
        createOfferDto.priceDelta,
        createOfferDto.isBuyOffer ? 'buy' : 'sell'
      );

    const offer = this.p2pOfferRepository.create({
      userId,
      tokenId: createOfferDto.tokenId,
      amount: createOfferDto.amount,
      price: calculatedPrice.price,
      priceUSD: calculatedPrice.priceUSD,
      currency: createOfferDto.currency,
      type: createOfferDto.isBuyOffer ? 'buy' : 'sell',
      terms: createOfferDto.terms,
      status: 'active',
      paymentMethods: createOfferDto.paymentMethods,
      metadata: {
        minAmount: createOfferDto.minAmount,
        maxAmount: createOfferDto.maxAmount,
      },
      priceType: createOfferDto.priceType,
      priceDelta: createOfferDto.priceDelta,
    });

      return await this.p2pOfferRepository.save(offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async getUserKycLevel(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['kycLevelDetails'],
    });

    if (!user || !user.kycLevelDetails) {
      throw new NotFoundException('KYC level not found');
    }

    return user.kycLevelDetails;
  }

  async getMyOffers(userId: string, isBuy: boolean) {
    const offers = await this.p2pOfferRepository.find({
      where: {
        userId,
        type: isBuy ? 'buy' : 'sell',
      },
      relations: ['token'],
      order: {
        createdAt: 'DESC',
      },
    });

    // Get all payment method types and methods
    const paymentMethodTypes = await this.paymentMethodTypeRepository.find();
    const paymentMethods = await this.paymentMethodRepository.find({
      where: { userId },
      relations: ['paymentMethodType'],
    });

    // Map payment methods to their names
    return offers.map(offer => {
      const paymentMethodsWithNames = offer.paymentMethods.map(method => {
        if (offer.type === 'buy') {
          return {
            ...method,
            name: paymentMethodTypes.find(type => type.id === method.typeId)?.name || 'Unknown'
          };
        } else {
          const paymentMethod = paymentMethods.find(pm => pm.id === method.methodId);
          return {
            ...method,
            name: paymentMethod?.paymentMethodType?.name || 'Unknown',
            details: paymentMethod?.details || {}
          };
        }
      });

      return {
        ...offer,
        symbol: offer.token?.symbol,
        paymentMethods: paymentMethodsWithNames
      };
    });
  }

  async getPublicOffers(
    filters: {
      type: 'buy' | 'sell';
      currency?: string;
      tokenId?: string;
      paymentMethodId?: string;
      minAmount?: number;
      page?: number;
      limit?: number;
    },
    currentUserId: string
  ) {
    try {
      const { 
        type, currency, tokenId, paymentMethodId, 
        minAmount, page = 1, limit = 10 
      } = filters;

      console.log('Received filters:', { type, currency, tokenId, minAmount });
      
      const queryBuilder = this.p2pOfferRepository
        .createQueryBuilder('offer')
        .leftJoinAndSelect('offer.token', 'token')
        .leftJoinAndSelect('offer.user', 'user')
        .where('offer.status = :status', { status: 'active' })
        .andWhere('offer.type = :type', { type: type === 'buy' ? 'sell' : 'buy' })
        .andWhere('offer.userId != :currentUserId', { currentUserId });

      // Apply filters
      if (currency) {
        queryBuilder.andWhere('offer.currency = :currency', { currency });
      }
      if (tokenId) {
        // Get the token's baseSymbol first
        const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
        if (token) {
          // Match offers for any token with the same baseSymbol
          queryBuilder.andWhere('token.baseSymbol = :baseSymbol', { 
            baseSymbol: token.baseSymbol 
          });
        }
      }
      if (paymentMethodId) {
        queryBuilder.andWhere(`offer.paymentMethods @> :paymentMethod`, {
          paymentMethod: JSON.stringify([{ typeId: paymentMethodId }]),
        });
      }
      if (minAmount !== undefined) {
        queryBuilder.andWhere('CAST(offer.amount AS NUMERIC) >= :minAmount', { 
          minAmount: Number(minAmount) 
        });
      }

      // Fix the order by clause
      queryBuilder
        .orderBy('offer.price', 'ASC')  // Changed from CAST syntax to direct column reference
        .skip((page - 1) * limit)
        .take(limit);

      const [offers, total] = await queryBuilder.getManyAndCount();

      console.log('Found offers:', offers.length);
      console.log('Sample offer amounts and prices:', offers.map(o => ({
        id: o.id,
        amount: o.amount,
        price: o.price
      })));

      // Get all payment method types
      const paymentMethodTypes = await this.paymentMethodTypeRepository.find();
      
      // For sell offers (shown in buy tab), get the sellers' payment methods
      const sellerIds = offers.filter(o => o.type === 'sell').map(o => o.userId);
      const sellersPaymentMethods = await this.paymentMethodRepository.find({
        where: { userId: In(sellerIds) },
        relations: ['paymentMethodType'],
      });

      console.log('Fetched offers:', offers);
      console.log('Payment method types:', paymentMethodTypes);
      console.log('Sellers payment methods:', sellersPaymentMethods);

      return {
        offers: await Promise.all(offers.map(async offer => {
          // Calculate current price using existing calculateOfferPrice method
          const calculatedPrice = await this.calculateOfferPrice(
            offer.token.id,
            offer.currency,
            offer.priceType,
            offer.priceDelta,
            offer.type
          );

          console.log('Calculated price for offer:', {
            offerId: offer.id,
            price: calculatedPrice.price,
            priceUSD: calculatedPrice.priceUSD
          });

          const mappedOffer = {
            ...offer,
            calculatedPrice: calculatedPrice.price,
            marketPrice: calculatedPrice.marketPrice,
            paymentMethods: offer.paymentMethods.map(method => {
              if (offer.type === 'buy') {
                const foundType = paymentMethodTypes.find(type => type.id === method.typeId);
                return {
                  ...method,
                  name: foundType?.name || 'Unknown'
                };
              } else {
                const paymentMethod = sellersPaymentMethods.find(
                  pm => pm.id === method.methodId && pm.userId === offer.userId
                );
                console.log('Found seller payment method:', paymentMethod);
                return {
                  ...method,
                  name: paymentMethod?.paymentMethodType?.name || 'Unknown'
                };
              }
            }),
            user: {
              id: offer.user.id,
              name: offer.user.fullName,
            },
          };
          return mappedOffer;
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPublicOffers:', error);
      throw error;
    }
  }

  async getActiveCurrencies() {
    try {
      return this.currencyRepository.find({
        where: { isActive: true },
        order: { symbol: 'ASC' },
      });
    } catch (error) {
      console.error('Error in getActiveCurrencies:', error);
      throw error;
    }
  }

  async getActivePaymentMethodTypes() {
    try {
      return this.paymentMethodTypeRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    } catch (error) {
      console.error('Error in getActivePaymentMethodTypes:', error);
      throw error;
    }
  }

  async getActiveOfferByUserAndToken(userId: string, tokenId: string, type: 'buy' | 'sell', currency: string) {
    // First get the token to find its baseSymbol
    const token = await this.tokenRepository.findOne({ 
      where: { id: tokenId } 
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Then find any active offer for this user with the same baseSymbol and currency
    return this.p2pOfferRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.token', 'token')
      .where('offer.userId = :userId', { userId })
      .andWhere('offer.type = :type', { type })
      .andWhere('offer.status = :status', { status: 'active' })
      .andWhere('token.baseSymbol = :baseSymbol', { baseSymbol: token.baseSymbol })
      .andWhere('offer.currency = :currency', { currency })
      .getOne();
  }

  async updateOffer(offerId: string, updateOfferDto: CreateOfferDto) {
    const offer = await this.p2pOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Calculate new price based on price type and delta
    const calculatedPrice = await this.calculateOfferPrice(
      offer.tokenId,
      offer.currency,
      updateOfferDto.priceType,
      updateOfferDto.priceDelta,
      offer.type
    );

    // Update the offer with new data
    Object.assign(offer, {
      amount: updateOfferDto.amount,
      terms: updateOfferDto.terms,
      paymentMethods: updateOfferDto.paymentMethods,
      metadata: {
        minAmount: updateOfferDto.minAmount,
        maxAmount: updateOfferDto.maxAmount,
      },
      priceType: updateOfferDto.priceType,
      priceDelta: updateOfferDto.priceDelta,
      price: calculatedPrice.price,
      priceUSD: calculatedPrice.priceUSD,
    });

    return this.p2pOfferRepository.save(offer);
  }

  async getKYCLevels() {
    return this.kycLevelRepository.find();
  }

  async getOfferDetails(offerId: string) {
    const offer = await this.p2pOfferRepository.findOne({
      where: { id: offerId },
      relations: ['user', 'token'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: offer.userId },
      select: ['id', 'fullName', 'kycLevel'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const kycLevel = await this.kycLevelRepository.findOne({
      where: { level: user.kycLevel },
    });

    const paymentMethodTypes = await this.paymentMethodTypeRepository.find();
    const paymentMethods = await this.paymentMethodRepository.find({
      where: { id: In(offer.paymentMethods.map(pm => pm.methodId)) },
    });

    // Fetch the exchange rate
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: { currency: offer.currency.toLowerCase() },
    });

    if (!exchangeRate) {
      console.error(`Exchange rate for currency ${offer.currency} not found.`);
      throw new NotFoundException(`Exchange rate for currency ${offer.currency} not found.`);
    }

    // Convert market price to offer currency
    const marketPriceUSD = parseFloat(offer.token.currentPrice.toString());
    const marketPrice = marketPriceUSD * parseFloat(exchangeRate.rate.toString());
    let calculatedPrice = marketPrice;

    // console.log('Market Price (USD):', marketPriceUSD);
    // console.log('Exchange Rate:', exchangeRate.rate);
    // console.log('Market Price (Converted):', marketPrice);
    // console.log('Price Type:', offer.priceType);
    // console.log('Price Delta:', offer.priceDelta);

    if (offer.priceType === 'percentage') {
      calculatedPrice *= (1 + parseFloat(offer.priceDelta.toString()) / 100);
    } else {
      calculatedPrice += parseFloat(offer.priceDelta.toString());
    }

    // console.log('Calculated Price:', calculatedPrice);

    const response = {
      ...offer,
      user: {
        ...user,
        kycLevel: kycLevel?.title || 'Unverified',
      },
      calculatedPrice: calculatedPrice.toFixed(2), // Include calculated price
      paymentMethods: offer.paymentMethods.map(method => {
        const paymentMethod = paymentMethods.find(pm => pm.id === method.methodId);
        const type = paymentMethodTypes.find(t => t.id === paymentMethod?.paymentMethodTypeId);
        return {
          ...method,
          typeName: type?.name || 'Unknown',
          methodName: paymentMethod?.name || 'Unknown',
          description: type?.description || 'No description available',
          icon: type?.icon || 'payment',
        };
      }),
    };

    return response;
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    // Check if required fields are provided
    if (!createOrderDto.offerId) {
      throw new BadRequestException('Offer ID is required');
    }
    
    if (!createOrderDto.buyerId) {
      throw new BadRequestException('Buyer ID is required');
    }
    
    if (!createOrderDto.sellerId) {
      throw new BadRequestException('Seller ID is required');
    }

    // Check if the offer exists
    const offer = await this.p2pOfferRepository.findOne({
      where: { id: createOrderDto.offerId }
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${createOrderDto.offerId} not found`);
    }

    // Check if the buyer exists
    const buyer = await this.userRepository.findOne({
      where: { id: createOrderDto.buyerId }
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${createOrderDto.buyerId} not found`);
    }

    // Check if the seller exists
    const seller = await this.userRepository.findOne({
      where: { id: createOrderDto.sellerId }
    });

    if (!seller) {
      throw new NotFoundException(`Seller with ID ${createOrderDto.sellerId} not found`);
    }

    // Parse the payment metadata if it's a string
    let paymentMetadata = createOrderDto.paymentMetadata;
    if (typeof paymentMetadata === 'string') {
      try {
        paymentMetadata = JSON.parse(paymentMetadata);
      } catch (e) {
        // If it's not valid JSON, keep it as is
      }
    }

    // Calculate payment deadline (30 minutes from now)
    const now = new Date();
    const paymentDeadline = new Date(now);
    paymentDeadline.setMinutes(paymentDeadline.getMinutes() + 15);
    
    // Generate a user-friendly tracking ID (10 characters alphanumeric)
    const generateTrackingId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Ensure the tracking ID is unique
    let trackingId = generateTrackingId();
    let existingOrder = await this.orderRepository.findOne({ where: { trackingId } });
    
    // If a collision occurs, regenerate until we get a unique ID
    while (existingOrder) {
      trackingId = generateTrackingId();
      existingOrder = await this.orderRepository.findOne({ where: { trackingId } });
    }

    const order = this.orderRepository.create({
      ...createOrderDto,
      paymentMetadata,
      trackingId,
      paymentDeadline,
      price: createOrderDto.calculatedPrice, // Store the price user saw and agreed to
    });

    const savedOrder = await this.orderRepository.save(order);

    // Get the complete offer with relations
    const offerWithRelations = await this.p2pOfferRepository.findOne({
      where: { id: offer.id },
      relations: ['token']
    });

    if (!offerWithRelations || !offerWithRelations.token) {
      console.error('Token not found for offer:', offer.id);
      return savedOrder;
    }

    // Get the token directly from the relations
    const token = offerWithRelations.token;

    // Format amounts with proper comma separation
    const formatAmount = (amount: number | string): string => {
      // Convert to number if it's a string
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      // Format with commas for thousands
      return numAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
    };

    // Format amounts
    const assetAmount = formatAmount(createOrderDto.assetAmount);
    const currencyAmount = `${offer.currency} ${formatAmount(createOrderDto.currencyAmount)}`;

    // Find the seller's funding wallet balance for this token
    const sellerWalletBalance = await this.walletBalanceRepository.findOne({
      where: {
        userId: seller.id,
        type: 'funding',
        baseSymbol: token.symbol
      }
    });

    if (!sellerWalletBalance) {
      console.error(`Seller does not have a funding wallet balance for ${token.symbol}`);
    } else {
      // Update the seller's wallet balance - move funds from available to frozen
      const currentBalance = parseFloat(sellerWalletBalance.balance.toString());
      const orderAmount = parseFloat(createOrderDto.assetAmount.toString());
      const currentFrozen = parseFloat(sellerWalletBalance.frozen?.toString() || '0');
      
      // Ensure seller has enough balance
      if (currentBalance < orderAmount) {
        throw new BadRequestException(`Seller does not have enough ${token.symbol} balance`);
      }
      
      // Update the balance - convert numbers to strings
      sellerWalletBalance.balance = (currentBalance - orderAmount).toString();
      sellerWalletBalance.frozen = (currentFrozen + orderAmount).toString();
      
      // Save the updated balance
      await this.walletBalanceRepository.save(sellerWalletBalance);
      
      console.log(`Updated seller's wallet balance: ${orderAmount} ${token.symbol} moved to frozen`);
    }

    // Send appropriate emails based on the offer type and user roles
    if (offer.type === 'sell') {
      // Frontend displays this as a buy offer:
      // - The offer creator is the seller
      // - The order creator is the buyer
      
      // Send buyer email to the order creator (buyer)
      this.emailService.sendP2POrderCreatedBuyerEmail(
        buyer.email,
        buyer.fullName,
        trackingId,
        assetAmount,
        currencyAmount,
        token.symbol,
        paymentDeadline
      );
      
      // Send seller email to the offer creator (seller)
      this.emailService.sendP2POrderReceivedSellerEmail(
        seller.email,
        seller.fullName,
        trackingId,
        assetAmount,
        token.symbol,
        currencyAmount,
        paymentDeadline
      );
    } else {
      // Frontend displays this as a sell offer:
      // - The offer creator is the buyer
      // - The order creator is the seller
      
      // Send seller email to the order creator (seller)
      this.emailService.sendP2POrderCreatedSellerEmail(
        seller.email,
        seller.fullName,
        trackingId,
        assetAmount,
        token.symbol,
        currencyAmount,
        paymentDeadline
      );
      
      // Send buyer email to the offer creator (buyer)
      this.emailService.sendP2POrderReceivedBuyerEmail(
        buyer.email,
        buyer.fullName,
        trackingId,
        assetAmount,
        currencyAmount,
        token.symbol,
        paymentDeadline
      );
    }

    // Create initial system message with offer terms
    if (order) {
      await this.createSystemMessage(
        order.id,
        offer.terms || 'No specific terms provided.'
      );
    }

    return savedOrder;
  }

  async getOrderByTrackingId(trackingId: string) {
    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['offer', 'offer.token', 'buyer', 'seller'],
    });

    if (!order) {
      throw new NotFoundException(`Order with tracking ID ${trackingId} not found`);
    }

    // Calculate time remaining first so we can use these variables
    const now = new Date();
    const paymentDeadline = order.paymentDeadline;
    const timeRemainingMs = paymentDeadline ? paymentDeadline.getTime() - now.getTime() : 0;
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60)));
    const timeRemainingSeconds = Math.max(0, Math.floor((timeRemainingMs % (1000 * 60)) / 1000));

    // If this is a buy order, we need to fetch the complete payment method details
    if (order.buyerId === order.buyerId) {
      try {
        // Parse the payment metadata
        const paymentMetadata = typeof order.paymentMetadata === 'string' 
          ? JSON.parse(order.paymentMetadata) 
          : order.paymentMetadata;
        
        // Get the method ID
        const methodId = paymentMetadata?.methodId;
        
        if (methodId) {
          // Fetch the complete payment method
          const paymentMethod = await this.paymentMethodRepository.findOne({
            where: { id: methodId },
            relations: ['paymentMethodType'],
          });
          
          if (paymentMethod) {
            // Add the complete payment details to the order response, not directly to the order
            const orderResponse = {
              ...order,
              completePaymentDetails: paymentMethod,
              price: order.price,
              timeRemaining: {
                minutes: timeRemainingMinutes,
                seconds: timeRemainingSeconds,
                total: timeRemainingMs
              }
            };
            
            return orderResponse;
          }
        }
      } catch (error) {
        console.error('Error fetching payment method details:', error);
        // Continue without the payment details
      }
    }
    
    // If we didn't return early with payment details, return the standard response
    return {
      ...order,
      price: order.price,
      timeRemaining: {
        minutes: timeRemainingMinutes,
        seconds: timeRemainingSeconds,
        total: timeRemainingMs
      }
    };
  }

  async getPaymentMethodById(id: string) {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id },
      relations: ['paymentMethodType'],
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    // Get the payment method fields for this payment method type
    const paymentMethodFields = await this.paymentMethodFieldRepository.find({
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
      console.error('Error parsing payment method details:', error);
    }

    // Return the complete payment method with fields and details
    return {
      ...paymentMethod,
      details,
      fields: paymentMethodFields,
    };
  }

  async getOrders({
    userId,
    type,
    status,
    search,
    page = 1,
    limit = 10,
  }: {
    userId: string;
    type?: 'buy' | 'sell';
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const query = this.orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.offer', 'offer')
        .leftJoinAndSelect('offer.token', 'token')
        .leftJoinAndSelect('order.buyer', 'buyer')
        .leftJoinAndSelect('order.seller', 'seller')
        .where(type === 'buy' ? 'order.buyerId = :userId' : 'order.sellerId = :userId', { userId });

      // Apply status filter
      if (status) {
        query.andWhere(type === 'buy' ? 'order.buyerStatus = :status' : 'order.sellerStatus = :status', { status });
      }

      // Improve search filter to be more precise
      if (search) {
        console.log('Searching with:', search); // Debug log

        query.andWhere(new Brackets(qb => {
          qb.where('order.trackingId ILIKE :searchId', { searchId: `%${search}%` }) // Partial match for ID
            .orWhere('LOWER(buyer.fullName) ILIKE LOWER(:name)', { name: `%${search}%` })
            .orWhere('LOWER(seller.fullName) ILIKE LOWER(:name)', { name: `%${search}%` });
        }));

        // Debug log the generated query
        // console.log('Generated SQL:', query.getSql());
      }

      // Ensure page and limit are numbers
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Update pagination
      query.skip(skip).take(take);

      // Order by most recent first
      query.orderBy('order.createdAt', 'DESC');

      // Get total count for pagination
      const [orders, total] = await query.getManyAndCount();

      // Transform the data
      const transformedOrders = orders.map(order => {
        let paymentMetadata;
        try {
          paymentMetadata = typeof order.paymentMetadata === 'string' 
            ? JSON.parse(order.paymentMetadata)
            : order.paymentMetadata;
        } catch (error) {
          paymentMetadata = {};
        }

        // Format the numbers to max 8 decimal places
        const amount = Number(order.assetAmount).toFixed(8).replace(/\.?0+$/, '');
        const price = Number(order.price).toFixed(2);  // Use stored price instead of calculating
        
        return {
          id: order.trackingId,
          type: order.buyerId === userId ? 'BUY' : 'SELL',
          amount,
          crypto: order.offer.token.symbol,
          price,
          total: Number(order.currencyAmount).toFixed(2),
          status: order.buyerStatus,
          buyerStatus: order.buyerStatus,
          sellerStatus: order.sellerStatus,
          date: order.createdAt,
          counterparty: userId === order.buyerId ? order.seller.fullName : order.buyer.fullName,
          counterpartyId: userId === order.buyerId ? order.seller.id : order.buyer.id,
          paymentMethod: paymentMetadata.methodName || 'Unknown',
          timeLeft: order.paymentDeadline ? new Date(order.paymentDeadline).getTime() - new Date().getTime() : null,
        };
      });

      return {
        orders: transformedOrders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        }
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  async confirmOrderPayment(trackingId: string, userId: string): Promise<Order> {
    try {
      // Add debug logs
      console.log('Confirming payment for order:', trackingId);
      console.log('User ID:', userId);

      const order = await this.orderRepository.findOne({
        where: { trackingId },
        relations: ['buyer', 'seller', 'offer', 'offer.token'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Verify user is the buyer
      if (order.buyerId !== userId) {
        console.log('Buyer check failed:', {
          orderBuyerId: order.buyerId,
          requestUserId: userId,
          areEqual: order.buyerId === userId
        });
        throw new ForbiddenException('Only the buyer can confirm payment');
      }

      // Verify order is in correct state
      if (order.buyerStatus !== 'pending') {
        throw new BadRequestException('Order is not in pending state');
      }

      // Update order status
      order.buyerStatus = 'paid';
      order.paidAt = new Date();
      // Set 30 minutes deadline for seller to confirm
      order.confirmationDeadline = new Date(Date.now() + 30 * 60 * 1000);
      const updatedOrder = await this.orderRepository.save(order);

      // Add system message to chat
      await this.createSystemMessage(
        order.id,
        'The buyer has marked the order as paid. Waiting for seller to confirm and release coin.'
      );

      // Send email notification to seller
      await this.emailService.sendP2POrderPaidEmail(
        order.seller.email,
        order.seller.fullName,
        order.trackingId,
        order.assetAmount.toString(),
        order.offer.token.symbol,
        `${order.currencyAmount.toString()} ${order.offer.currency}`,
        order.confirmationDeadline
      );

      // Log successful update
      console.log('Order updated successfully:', {
        orderId: order.id,
        newStatus: order.buyerStatus,
        paidAt: order.paidAt
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error in confirmOrderPayment:', error);
      throw error;
    }
  }

  async releaseOrder(trackingId: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['buyer', 'seller', 'offer', 'offer.token'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify user is the seller
    if (order.sellerId !== userId) {
      throw new BadRequestException('Only the seller can release funds');
    }

    // Verify order is in correct state
    if (order.buyerStatus !== 'paid') {
      throw new BadRequestException('Buyer has not confirmed payment');
    }

    // Update order status
    order.buyerStatus = 'completed';
    order.sellerStatus = 'completed';
    
    // Transfer funds from escrow to buyer
    await this.transferFundsFromEscrow(order);

    const updatedOrder = await this.orderRepository.save(order);

    // Emit update
    await this.orderGateway.emitOrderUpdate(
      trackingId,
      order.buyer.id,
      order.seller.id,
      updatedOrder
    );

    return updatedOrder;
  }

  async cancelOrder(trackingId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['buyer', 'seller', 'offer', 'offer.token'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify user is either buyer or seller
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('Unauthorized to cancel this order');
    }

    // Verify order is in cancellable state
    if (order.buyerStatus === 'completed' || order.sellerStatus === 'completed') {
      throw new BadRequestException('Cannot cancel completed order');
    }

    if (order.buyerStatus === 'disputed' || order.sellerStatus === 'disputed') {
      throw new BadRequestException('Cannot cancel disputed order');
    }

    // Update order status
    order.buyerStatus = 'cancelled';
    order.sellerStatus = 'cancelled';

    // If seller cancels or if buyer cancels before payment, return funds to seller
    if (order.buyerStatus !== 'paid') {
      await this.returnFundsToSeller(order);
    }

    await this.orderRepository.save(order);

    // TODO: Send notification to counterparty

    return { message: 'Order cancelled successfully' };
  }

  async disputeOrder(trackingId: string, userId: string, reason: string) {
    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['buyer', 'seller', 'offer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify user is either buyer or seller
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('Unauthorized to dispute this order');
    }

    // Verify order is in disputable state
    if (order.buyerStatus === 'completed' || order.sellerStatus === 'completed') {
      throw new BadRequestException('Cannot dispute completed order');
    }

    if (order.buyerStatus === 'cancelled' || order.sellerStatus === 'cancelled') {
      throw new BadRequestException('Cannot dispute cancelled order');
    }

    // Update order status - set both to disputed regardless of who initiated
    order.buyerStatus = 'disputed';
    order.sellerStatus = 'disputed';

    // Save dispute details
    await this.disputeRepository.save({
      orderId: order.id,
      initiatorId: userId,
      reason,
      status: 'pending',
    });

    await this.orderRepository.save(order);

    // Add system message to chat
    const isUserBuyer = order.buyerId === userId;
    const userRole = isUserBuyer ? 'buyer' : 'seller';
    await this.createSystemMessage(
      order.id,
      `The ${userRole} has raised a dispute: ${reason}`
    );
    
    // TODO: Send notification to admin and counterparty

    return { message: 'Dispute raised successfully' };
  }

  private async transferFundsFromEscrow(order: Order) {
    // Implementation for transferring funds from escrow to buyer
    // This would involve your actual business logic for handling the transfer
  }

  private async returnFundsToSeller(order: Order) {
    try {
      console.log('Returning funds to seller:', {
        orderId: order.id,
        sellerId: order.sellerId,
        amount: order.assetAmount,
        token: order.offer.token.symbol
      });

      // Find the seller's funding wallet balance for this token
      const sellerWalletBalance = await this.walletBalanceRepository.findOne({
        where: {
          userId: order.sellerId,
          type: 'funding',
          baseSymbol: order.offer.token.symbol
        }
      });

      if (!sellerWalletBalance) {
        console.error(`Seller does not have a funding wallet balance for ${order.offer.token.symbol}`);
        throw new Error('Seller wallet balance not found');
      }

      // Parse current balances
      const currentBalance = parseFloat(sellerWalletBalance.balance.toString());
      const currentFrozen = parseFloat(sellerWalletBalance.frozen?.toString() || '0');
      const orderAmount = parseFloat(order.assetAmount.toString());

      // Verify there are enough frozen funds
      if (currentFrozen < orderAmount) {
        console.error('Insufficient frozen balance:', {
          frozen: currentFrozen,
          required: orderAmount
        });
        throw new Error('Insufficient frozen balance');
      }

      // Update the balances - move from frozen to available
      sellerWalletBalance.frozen = (currentFrozen - orderAmount).toString();
      sellerWalletBalance.balance = (currentBalance + orderAmount).toString();

      // Save the updated balance
      await this.walletBalanceRepository.save(sellerWalletBalance);

      console.log('Successfully returned funds to seller:', {
        newBalance: sellerWalletBalance.balance,
        newFrozen: sellerWalletBalance.frozen
      });
    } catch (error) {
      console.error('Error returning funds to seller:', error);
      throw error;
    }
  }

  // New methods for chat functionality
  async createSystemMessage(orderId: string, message: string): Promise<P2PChatMessage> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['buyer', 'seller']
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const chatMessage = this.chatMessageRepository.create({
      orderId,
      messageType: MessageType.SYSTEM,
      message,
      isDelivered: true, // System messages are always delivered
      isRead: false,
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);
    await this.chatGateway.emitChatUpdate(orderId, savedMessage);

    // Send email notifications for system message
    await Promise.all([
      this.emailService.sendP2PNewMessageEmail(
        order.buyer.email,
        order.buyer.fullName,
        order.trackingId,
        true
      ),
      this.emailService.sendP2PNewMessageEmail(
        order.seller.email,
        order.seller.fullName,
        order.trackingId,
        true
      )
    ]);

    return savedMessage;
  }

  async createUserMessage(
    orderId: string,
    userId: string,
    message: string,
    isBuyer: boolean,
  ): Promise<P2PChatMessage> {
    const chatMessage = this.chatMessageRepository.create({
      orderId,
      senderId: userId,
      messageType: isBuyer ? MessageType.BUYER : MessageType.SELLER,
      message,
      isDelivered: false,
      isRead: false,
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);
    await this.chatGateway.emitChatUpdate(orderId, savedMessage);
    return savedMessage;
  }

  async getOrderMessages(orderId: string): Promise<P2PChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });
  }

  async markMessageAsDelivered(messageId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });
    
    if (message) {
      message.isDelivered = true;
      await this.chatMessageRepository.save(message);
      await this.chatGateway.emitMessageDelivered(message.orderId, messageId);
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });
    
    if (message) {
      message.isRead = true;
      await this.chatMessageRepository.save(message);
      await this.chatGateway.emitMessageRead(message.orderId, messageId);
    }
  }

  async createMessage(
    trackingId: string, 
    userId: string, 
    message: string,
    attachment?: string
  ) {
    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['buyer', 'seller']
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isBuyer = order.buyerId === userId;
    if (!isBuyer && order.sellerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    let attachmentUrl: string | undefined;
    if (attachment) {
      try {
        attachmentUrl = await this.fileService.saveChatImage(attachment);
      } catch (error) {
        console.error('Failed to save attachment:', error);
        throw new BadRequestException('Invalid attachment');
      }
    }

    const chatMessage = await this.chatMessageRepository.create({
      orderId: order.id,
      senderId: userId,
      messageType: isBuyer ? MessageType.BUYER : MessageType.SELLER,
      message,
      attachmentUrl,
      attachmentType: attachmentUrl ? 'image' : undefined,
      isDelivered: false,
      isRead: false,
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);
    
    // Emit to websocket
    await this.chatGateway.emitChatUpdate(order.id, savedMessage);

    // Send email notification to recipient
    const isSystemMessage = chatMessage.messageType === MessageType.SYSTEM;
    if (isSystemMessage) {
      // Send to both buyer and seller for system messages
      await Promise.all([
        this.emailService.sendP2PNewMessageEmail(
          order.buyer.email,
          order.buyer.fullName,
          trackingId,
          true
        ),
        this.emailService.sendP2PNewMessageEmail(
          order.seller.email,
          order.seller.fullName,
          trackingId,
          true
        )
      ]);
    } else {
      // Send only to the recipient
      const recipient = isBuyer ? order.seller : order.buyer;
      await this.emailService.sendP2PNewMessageEmail(
        recipient.email,
        recipient.fullName,
        trackingId
      );
    }

    return savedMessage;
  }

  async createDispute(
    trackingId: string,
    userId: string,
    reasonType: string,
    reason: string,
    evidence?: any
  ): Promise<P2PDispute> {
    // Validate reasonType
    const validReasonTypes = Object.values(DisputeReasonType);
    if (!validReasonTypes.includes(reasonType as DisputeReasonType)) {
      console.warn(`Invalid reasonType provided: ${reasonType}. Valid types are: ${validReasonTypes.join(', ')}`);
      reasonType = DisputeReasonType.OTHER; // Default to OTHER if invalid
    }

    const order = await this.orderRepository.findOne({
      where: { trackingId },
      relations: ['buyer', 'seller', 'offer', 'offer.token'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify user is either buyer or seller
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Not authorized to dispute this order');
    }

    // Verify order is in disputable state
    if (order.buyerStatus === 'completed' || order.sellerStatus === 'completed') {
      throw new BadRequestException('Cannot dispute completed order');
    }

    if (order.buyerStatus === 'cancelled' || order.sellerStatus === 'cancelled') {
      throw new BadRequestException('Cannot dispute cancelled order');
    }

    // Check if dispute already exists
    const existingDispute = await this.p2pDisputeRepository.findOne({
      where: { orderId: order.id },
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this order');
    }

    // Update order status - set both statuses to disputed regardless of who initiated
    order.buyerStatus = 'disputed';
    order.sellerStatus = 'disputed';

    await this.orderRepository.save(order);

    // Create dispute record
    const dispute = this.p2pDisputeRepository.create({
      orderId: order.id,
      initiatorId: userId,
      respondentId: userId === order.buyerId ? order.sellerId : order.buyerId,
      reason,
      reasonType: reasonType as DisputeReasonType,
      status: DisputeStatus.PENDING,
      evidence,
    });

    // Initialize progress history with the first entry
    dispute.progressHistory = [{
      title: 'Dispute Opened',
      details: reason,
      timestamp: new Date().toISOString(),
      addedBy: userId
    }];

    const savedDispute = await this.p2pDisputeRepository.save(dispute);

    // Add system message to regular P2P chat
    const isUserBuyer = order.buyerId === userId;
    const userRole = isUserBuyer ? 'buyer' : 'seller';
    await this.createSystemMessage(
      order.id,
      `The ${userRole} has raised a dispute: ${reason}`
    );

    // Create system message for dispute chat
    await this.createDisputeSystemMessage(
      savedDispute.id,
      `Dispute opened by ${userId === order.buyerId ? 'buyer' : 'seller'}: ${reason}`
    );

    // Emit order update
    await this.orderGateway.emitOrderUpdate(
      trackingId,
      order.buyer.id,
      order.seller.id,
      order
    );

    // Determine initiator and respondent for emails
    const initiator = userId === order.buyerId ? order.buyer : order.seller;
    const respondent = userId === order.buyerId ? order.seller : order.buyer;

    try {
      // Get admin email(s) from the database (using entityManager to query across modules)
      const admins = await this.p2pDisputeRepository.manager.query(
        `SELECT email FROM admins WHERE "isActive" = true`
      );
      
      if (admins && admins.length > 0) {
        // Format values for email
        const tokenSymbol = order.offer.token.symbol;
        const currency = order.offer.currency; // Get currency from offer
        const amount = order.assetAmount.toString();
        const formattedCurrencyAmount = order.currencyAmount.toString();
        
        // Send email to all active admins
        for (const admin of admins) {
          await this.emailService.sendP2PDisputeCreatedAdminEmail(
            admin.email,
            trackingId,
            amount,
            tokenSymbol,
            currency,
            reasonType,
            reason,
            initiator.fullName,
            respondent.fullName
          );
        }
      }
      
      // Send email to the counterparty
      await this.emailService.sendP2PDisputeCreatedUserEmail(
        respondent.email,
        respondent.fullName,
        trackingId,
        order.assetAmount.toString(),
        order.offer.token.symbol,
        order.offer.currency,
        reasonType,
        reason
      );
      
    } catch (error) {
      console.error('Error sending dispute notification emails:', error);
      // We don't want to fail the dispute creation if emails fail to send
    }

    return savedDispute;
  }

  async getDisputeByOrderId(orderId: string, userId: string): Promise<P2PDispute> {
    const dispute = await this.p2pDisputeRepository.findOne({
      where: { orderId },
      relations: ['order', 'order.buyer', 'order.seller', 'order.offer', 'order.offer.token', 'initiator', 'respondent', 'admin'],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found for this order');
    }

    // Check if user is authorized to view this dispute
    if (
      dispute.initiatorId !== userId &&
      dispute.respondentId !== userId &&
      dispute.adminId !== userId
    ) {
      throw new ForbiddenException('Not authorized to view this dispute');
    }

    return dispute;
  }

  async getDisputeById(disputeId: string, userId: string): Promise<P2PDispute> {
    const dispute = await this.p2pDisputeRepository.findOne({
      where: { id: disputeId },
      relations: ['order', 'order.buyer', 'order.seller', 'order.offer', 'order.offer.token', 'initiator', 'respondent', 'admin'],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is authorized to view this dispute
    if (
      dispute.initiatorId !== userId &&
      dispute.respondentId !== userId &&
      dispute.adminId !== userId
    ) {
      throw new ForbiddenException('Not authorized to view this dispute');
    }

    return dispute;
  }

  async getDisputeMessages(disputeId: string, userId: string): Promise<P2PDisputeMessage[]> {
    const dispute = await this.p2pDisputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is authorized to view messages
    if (
      dispute.initiatorId !== userId &&
      dispute.respondentId !== userId &&
      dispute.adminId !== userId
    ) {
      throw new ForbiddenException('Not authorized to view these messages');
    }

    return this.disputeMessageRepository.find({
      where: { disputeId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });
  }

  async sendDisputeMessage(
    disputeId: string,
    userId: string,
    message: string,
    attachment?: string
  ): Promise<P2PDisputeMessage> {
    console.log('Starting sendDisputeMessage:', {
      disputeId,
      userId,
      hasAttachment: !!attachment,
      attachmentLength: attachment?.length
    });

    const dispute = await this.p2pDisputeRepository.findOne({
      where: { id: disputeId },
      relations: ['initiator', 'respondent', 'order'],
    });

    if (!dispute) {
      console.error('Dispute not found:', disputeId);
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is authorized to send messages
    if (
      dispute.initiatorId !== userId &&
      dispute.respondentId !== userId &&
      dispute.adminId !== userId
    ) {
      console.error('User not authorized:', {
        userId,
        initiatorId: dispute.initiatorId,
        respondentId: dispute.respondentId,
        adminId: dispute.adminId
      });
      throw new ForbiddenException('Not authorized to send messages in this dispute');
    }

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    
    if (attachment) {
      console.log('Processing attachment...');
      try {
        // Use the same file service as for chat attachments
        attachmentUrl = await this.fileService.saveChatImage(attachment);
        attachmentType = 'image';
        console.log('Attachment saved successfully:', {
          attachmentUrl,
          attachmentType
        });
      } catch (error) {
        console.error('Failed to save attachment:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw new BadRequestException('Invalid attachment');
      }
    }

    const senderType = dispute.adminId === userId 
      ? DisputeMessageSenderType.ADMIN 
      : DisputeMessageSenderType.USER;

    console.log('Creating dispute message:', {
      disputeId,
      senderId: userId,
      senderType,
      hasAttachment: !!attachmentUrl,
      attachmentType
    });

    const disputeMessage = this.disputeMessageRepository.create({
      disputeId,
      senderId: userId,
      senderType,
      message,
      attachmentUrl,
      attachmentType,
      isDelivered: false,
      isRead: false,
    });

    try {
      const savedMessage = await this.disputeMessageRepository.save(disputeMessage);
      console.log('Message saved successfully:', {
        messageId: savedMessage.id,
        hasAttachment: !!savedMessage.attachmentUrl
      });
      
      // Emit to websocket
      await this.disputeGateway.emitDisputeMessageUpdate(disputeId, savedMessage);
      console.log('Message emitted to websocket');

      // Send email notifications
      try {
        // Get admin email from database
        const admins = await this.p2pDisputeRepository.manager.query(
          `SELECT email FROM admins WHERE "isActive" = true LIMIT 1`
        );
        const adminEmail = admins?.[0]?.email;

        if (adminEmail) {
          // Determine recipient (the other party)
          const isInitiator = userId === dispute.initiatorId;
          const recipient = isInitiator ? dispute.respondent : dispute.initiator;
          const sender = isInitiator ? dispute.initiator : dispute.respondent;
          const isAdminSender = senderType === DisputeMessageSenderType.ADMIN;

          await this.emailService.sendP2PDisputeMessageNotification({
            userEmail: recipient.email,
            userName: recipient.fullName,
            adminEmail,
            disputeId,
            trackingId: dispute.order.trackingId,
            initiatorName: dispute.initiator.fullName,
            respondentName: dispute.respondent.fullName,
            senderName: sender.fullName,
            isAdmin: isAdminSender
          });
        }
      } catch (error) {
        console.error('Error sending dispute message notification emails:', error);
        // Don't throw error here - we don't want to fail the message send if email fails
      }

      return savedMessage;
    } catch (error) {
      console.error('Failed to save message:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private async createDisputeSystemMessage(
    disputeId: string,
    message: string
  ): Promise<P2PDisputeMessage> {
    const disputeMessage = this.disputeMessageRepository.create({
      disputeId,
      senderType: DisputeMessageSenderType.SYSTEM,
      message,
      isDelivered: true,
      isRead: false,
    });

    const savedMessage = await this.disputeMessageRepository.save(disputeMessage);
    await this.disputeGateway.emitDisputeMessageUpdate(disputeId, savedMessage);

    return savedMessage;
  }

  async markDisputeMessageAsDelivered(messageId: string): Promise<void> {
    const message = await this.disputeMessageRepository.findOne({
      where: { id: messageId },
    });
    
    if (message) {
      message.isDelivered = true;
      await this.disputeMessageRepository.save(message);
      await this.disputeGateway.emitDisputeMessageUpdate(message.disputeId, message);
    }
  }

  async markDisputeMessageAsRead(messageId: string): Promise<void> {
    const message = await this.disputeMessageRepository.findOne({
      where: { id: messageId },
    });
    
    if (message) {
      message.isRead = true;
      await this.disputeMessageRepository.save(message);
      await this.disputeGateway.emitDisputeMessageUpdate(message.disputeId, message);
    }
  }

  /**
   * Add a progress step to a dispute's history
   * @param disputeId ID of the dispute to update
   * @param title Short title for the progress step
   * @param details Detailed description of the progress
   * @param adminId ID of the admin adding this progress step
   * @returns Updated P2PDispute object
   */
  async addDisputeProgress(
    disputeId: string,
    title: string,
    details: string,
    adminId: string
  ): Promise<P2PDispute> {
    // Find the dispute
    const dispute = await this.p2pDisputeRepository.findOne({
      where: { id: disputeId },
      relations: ['order', 'initiator', 'respondent'],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify admin
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Create progress item
    const progressItem = {
      title,
      details,
      timestamp: new Date().toISOString(),
      addedBy: adminId
    };

    // Add to progress history
    if (!dispute.progressHistory) {
      dispute.progressHistory = [];
    }
    
    dispute.progressHistory.push(progressItem);

    // Save the updated dispute
    const updatedDispute = await this.p2pDisputeRepository.save(dispute);

    // Create a system message in the dispute chat to notify both parties
    await this.createDisputeSystemMessage(
      disputeId,
      `Progress Update - ${title}: ${details}`
    );

    // Create a system message in the P2P chat
    await this.createSystemMessage(
      dispute.order.id,
      `Dispute Progress Update - ${title}: ${details}`
    );

    // Emit update to websocket
    this.disputeGateway.emitDisputeUpdate(
      disputeId, 
      updatedDispute
    );

    return updatedDispute;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      relations: {
        buyer: true,
        seller: true,
        offer: {
          token: true
        }
      },
      order: {
        createdAt: 'DESC'
      },
      take: 10 // Limit to 10 most recent orders
    });
  }
} 