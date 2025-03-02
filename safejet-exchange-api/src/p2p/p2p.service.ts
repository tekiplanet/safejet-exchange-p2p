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