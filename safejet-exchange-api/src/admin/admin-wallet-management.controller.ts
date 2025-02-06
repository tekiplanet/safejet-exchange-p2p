import { Controller, Get, Post, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletService } from '../wallet/wallet.service';

@Controller('admin/wallet-management')
@UseGuards(AdminGuard)
export class AdminWalletManagementController {
    constructor(
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        private walletService: WalletService
    ) {}

    @Get(':userId/scan-wallets')
    async scanUserWallets(@Param('userId') userId: string) {
        // Expected blockchains from wallet creation
        const expectedBlockchains = ['bitcoin', 'ethereum', 'bsc', 'xrp', 'trx'];
        const networks = ['mainnet', 'testnet'];

        // Get user's existing wallets
        const existingWallets = await this.walletRepository.find({
            where: { userId },
            select: ['blockchain', 'network']
        });

        // Check what's missing
        const missingWallets = [];
        
        for (const blockchain of expectedBlockchains) {
            for (const network of networks) {
                const hasWallet = existingWallets.some(
                    w => w.blockchain === blockchain && w.network === network
                );
                if (!hasWallet) {
                    missingWallets.push({ blockchain, network });
                }
            }
        }

        return {
            existing: existingWallets,
            missing: missingWallets
        };
    }

    @Post(':userId/create-wallet')
    async createUserWallet(
        @Param('userId') userId: string,
        @Body() createWalletDto: { blockchain: string; network: string }
    ) {
        const { blockchain, network } = createWalletDto;

        // Check if wallet already exists
        const existingWallet = await this.walletRepository.findOne({
            where: { userId, blockchain, network }
        });

        if (existingWallet) {
            throw new BadRequestException('Wallet already exists');
        }

        // Use the same wallet service used in registration
        const wallet = await this.walletService.create(userId, { blockchain, network });
        
        return wallet;
    }
} 