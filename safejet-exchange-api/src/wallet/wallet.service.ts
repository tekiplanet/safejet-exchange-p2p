import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { KeyManagementService } from './key-management.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { Token } from './entities/token.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { tokenSeeds } from './seeds/tokens.seed';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(WalletBalance)
    private balanceRepository: Repository<WalletBalance>,
    private keyManagementService: KeyManagementService,
  ) {}

  async createWallet(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    // Check if active wallet exists for this blockchain and network
    const existingWallet = await this.walletRepository.findOne({
      where: {
        userId,
        blockchain: createWalletDto.blockchain,
        network: createWalletDto.network,
        status: 'active',
      },
    });

    if (existingWallet) {
      throw new BadRequestException(
        `Active wallet already exists for ${createWalletDto.blockchain} on ${createWalletDto.network}`
      );
    }

    // Generate wallet
    const { address, keyId } = await this.keyManagementService.generateWallet(
      userId,
      createWalletDto.blockchain,
      createWalletDto.network,
    );

    // Create wallet record
    const wallet = this.walletRepository.create({
      userId,
      blockchain: createWalletDto.blockchain,
      network: createWalletDto.network,
      address,
      keyId,
      metadata: {
        createdAt: new Date().toISOString(),
        network: createWalletDto.network,
      },
    });

    return this.walletRepository.save(wallet);
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId, status: 'active' },
    });
  }

  async getWallet(userId: string, walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  // Get all balances for a wallet
  async getWalletBalances(
    userId: string, 
    walletId: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance[]> {
    const wallet = await this.getWallet(userId, walletId);

    return this.balanceRepository.find({
      where: {
        walletId: wallet.id,
        type,
      },
      relations: ['token'],
    });
  }

  // Get specific token balance
  async getTokenBalance(
    userId: string,
    walletId: string,
    tokenId: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance> {
    const wallet = await this.getWallet(userId, walletId);

    return this.balanceRepository.findOne({
      where: {
        walletId: wallet.id,
        tokenId,
        type,
      },
      relations: ['token'],
    });
  }

  // Update balance
  async updateBalance(
    userId: string,
    walletId: string,
    tokenId: string,
    amount: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance> {
    const wallet = await this.getWallet(userId, walletId);
    
    let balance = await this.balanceRepository.findOne({
      where: {
        walletId: wallet.id,
        tokenId,
        type,
      },
    });

    if (!balance) {
      balance = this.balanceRepository.create({
        walletId: wallet.id,
        tokenId,
        balance: '0',
        type,
      });
    }

    balance.balance = amount;
    return this.balanceRepository.save(balance);
  }

  async seedTokens() {
    for (const tokenData of tokenSeeds) {
      const existingToken = await this.tokenRepository.findOne({
        where: {
          blockchain: tokenData.blockchain,
          symbol: tokenData.symbol,
          contractAddress: tokenData.contractAddress,
        },
      });

      if (!existingToken) {
        await this.tokenRepository.save(tokenData);
      }
    }
  }
} 