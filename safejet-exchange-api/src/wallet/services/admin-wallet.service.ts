import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminWallet } from '../entities/admin-wallet.entity';
import { KeyManagementService } from '../key-management.service';

@Injectable()
export class AdminWalletService {
    constructor(
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        private keyManagementService: KeyManagementService
    ) {}

    async getAdminWallet(blockchain: string, network: string): Promise<AdminWallet> {
        return this.adminWalletRepository.findOne({
            where: {
                blockchain,
                network,
                isActive: true,
                type: 'hot'
            }
        });
    }

    async scanMissingWallets() {
        const requiredWallets = [
            { blockchain: 'ethereum', network: 'mainnet' },
            { blockchain: 'ethereum', network: 'testnet' },
            { blockchain: 'bitcoin', network: 'mainnet' },
            { blockchain: 'bitcoin', network: 'testnet' },
            { blockchain: 'bsc', network: 'mainnet' },
            { blockchain: 'bsc', network: 'testnet' },
            { blockchain: 'trx', network: 'mainnet' },
            { blockchain: 'trx', network: 'testnet' },
            { blockchain: 'xrp', network: 'mainnet' },
            { blockchain: 'xrp', network: 'testnet' }
        ];

        // Get existing wallets
        const existingWallets = await this.adminWalletRepository.find({
            where: { isActive: true }
        });

        // Find missing combinations
        const missing = requiredWallets.filter(required => 
            !existingWallets.some(existing => 
                existing.blockchain === required.blockchain && 
                existing.network === required.network
            )
        );

        return { missing };
    }

    async createAdminWallet(blockchain: string, network: string, type: 'hot' | 'cold' = 'hot') {
        const existing = await this.getAdminWallet(blockchain, network);
        if (existing) {
            throw new Error(`Admin wallet already exists for ${blockchain} ${network}`);
        }

        const { address, keyId } = await this.keyManagementService.generateWallet(
            'admin',
            blockchain,
            network
        );

        const wallet = this.adminWalletRepository.create({
            blockchain,
            network,
            address,
            keyId,
            type,
            isActive: true
        });

        return this.adminWalletRepository.save(wallet);
    }

    // More methods for admin wallet management will be added here
} 