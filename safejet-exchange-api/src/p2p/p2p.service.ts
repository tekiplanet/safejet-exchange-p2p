import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { P2POffer } from './entities/p2p-offer.entity';
import { P2PTraderSettings } from '../p2p-settings/entities/p2p-trader-settings.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Token } from '../wallet/entities/token.entity';
import { ExchangeRate } from '../exchange/exchange-rate.entity';
import { PaymentMethod } from '../payment-methods/entities/payment-method.entity';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { CreateOfferDto } from './dto/create-offer.dto';

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
  ) {}

  async getAvailableAssets(userId: string, isBuyOffer: boolean) {
    if (isBuyOffer) {
      // For buy offers, get all unique tokens from wallet balances metadata
      const balances = await this.walletBalanceRepository.find({
        where: { userId },
      });

      const tokenIds = new Set<string>();
      balances.forEach(balance => {
        if (balance.metadata?.networks) {
          Object.values(balance.metadata.networks).forEach(network => {
            tokenIds.add(network.tokenId);
          });
        }
      });

      return this.tokenRepository.findByIds([...tokenIds]);

    } else {
      // For sell offers, only get tokens with non-zero funding balance
      const balances = await this.walletBalanceRepository.find({
        where: { 
          userId,
          type: 'funding'
        }
      });

      const nonZeroBalances = balances.filter(b => parseFloat(b.balance) > 0);
      
      const tokenIds = new Set<string>();
      nonZeroBalances.forEach(balance => {
        if (balance.metadata?.networks) {
          Object.values(balance.metadata.networks).forEach(network => {
            tokenIds.add(network.tokenId);
          });
        }
      });

      return this.tokenRepository.findByIds([...tokenIds]);
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
    // Get token's USD price from Token table
    const token = await this.tokenRepository.findOne({
      where: { symbol }
    });

    if (!token) {
      throw new NotFoundException(`Token ${symbol} not found`);
    }

    if (!currency || currency === 'USD') {
      return {
        price: token.currentPrice,
        lastUpdated: new Date(),  // Just use current time since we don't track last update time
      };
    }

    // Get USD to target currency rate
    const usdToCurrencyRate = await this.exchangeRateRepository.findOne({
      where: {
        currency: `USD/${currency}`,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      price: token.currentPrice * (usdToCurrencyRate?.rate ?? 0),
      lastUpdated: usdToCurrencyRate?.createdAt ?? new Date(),
    };
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

  async createOffer(userId: string, createOfferDto: CreateOfferDto) {
    // Create the offer
    const offer = this.p2pOfferRepository.create({
      userId,
      tokenId: createOfferDto.tokenId,
      amount: createOfferDto.amount,
      price: createOfferDto.price,
      currency: createOfferDto.currency,
      priceUSD: createOfferDto.priceUSD,
      type: createOfferDto.isBuyOffer ? 'buy' : 'sell',
      terms: createOfferDto.terms,
      status: 'active',
      paymentMethods: createOfferDto.paymentMethods,
    });

    // Save and return the offer
    return this.p2pOfferRepository.save(offer);
  }
} 