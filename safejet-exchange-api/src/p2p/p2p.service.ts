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
    if (isBuyOffer) {
      // For buy offers, get user's configured payment methods
      return this.paymentMethodRepository.find({
        where: { userId, isVerified: true },
        relations: ['type'],
      });
    } else {
      // For sell offers, get all active payment method types
      return this.paymentMethodTypeRepository.find({
        where: { isActive: true },
      });
    }
  }

  async createOffer(userId: string, createOfferDto: CreateOfferDto) {
    // For sell offers, check and lock funds
    if (!createOfferDto.isBuyOffer) {
      const fundingBalance = await this.walletBalanceRepository.findOne({
        where: { 
          userId,
          type: 'funding',
        },
      });

      if (!fundingBalance) {
        throw new BadRequestException('No funding wallet found');
      }

      // Check if token exists in networks metadata
      const hasToken = Object.values(fundingBalance.metadata?.networks || {}).some(
        network => network.tokenId === createOfferDto.tokenId
      );

      if (!hasToken || parseFloat(fundingBalance.balance) < createOfferDto.amount) {
        throw new BadRequestException('Insufficient balance');
      }
    }

    // Create the offer
    const offer = this.p2pOfferRepository.create({
      userId,
      tokenId: createOfferDto.tokenId,
      amount: createOfferDto.amount.toString(),
      price: createOfferDto.price.toString(),
      type: createOfferDto.isBuyOffer ? 'buy' : 'sell',
      terms: createOfferDto.terms,
      status: 'active',
      paymentMethods: createOfferDto.paymentMethods,
    });

    // Save the offer
    const savedOffer = await this.p2pOfferRepository.save(offer);

    // For sell offers, lock the funds
    if (!createOfferDto.isBuyOffer) {
      await this.walletBalanceRepository.update(
        { 
          userId,
          type: 'funding',
          // Find balance where tokenId exists in networks metadata
          metadata: Raw(metadata => 
            `jsonb_path_exists(${metadata}, '$.networks[*] ? (@.tokenId == "${createOfferDto.tokenId}")')`
          )
        },
        {
          balance: () => `balance - ${createOfferDto.amount}`,
          lockedBalance: () => `locked_balance + ${createOfferDto.amount}`,
        }
      );
    }

    return savedOffer;
  }
} 