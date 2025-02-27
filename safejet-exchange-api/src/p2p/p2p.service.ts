import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2POffer } from './entities/p2p-offer.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Token } from '../wallet/entities/token.entity';

@Injectable()
export class P2PService {
  constructor(
    @InjectRepository(P2POffer)
    private readonly p2pOfferRepository: Repository<P2POffer>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
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
} 