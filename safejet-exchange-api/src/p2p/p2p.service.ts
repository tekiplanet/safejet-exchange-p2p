import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, In } from 'typeorm';
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
    private readonly emailService: EmailService,
    @InjectRepository(PaymentMethodField)
    private readonly paymentMethodFieldRepository: Repository<PaymentMethodField>,
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
      // confirmationDeadline will be set later when the order is marked as paid
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
} 