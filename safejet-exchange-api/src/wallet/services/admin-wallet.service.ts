import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminWallet } from '../entities/admin-wallet.entity';
import { KeyManagementService } from '../key-management.service';

@Injectable()
export class AdminWalletService {
    constructor(
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        private keyManagementService: KeyManagementService,
        @Inject(REQUEST) private request: Request
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
        // First check if wallet exists in admin_wallets table
        const existing = await this.getAdminWallet(blockchain, network);
        if (existing) {
            throw new Error(`Admin wallet already exists for ${blockchain} ${network}`);
        }

        if (!this.request.admin?.sub) {
            throw new Error('Admin ID not found in request');
        }

        const adminId = this.request.admin.sub;

        // For EVM chains, check if we already have a wallet for another EVM chain
        if (['ethereum', 'bsc'].includes(blockchain.toLowerCase())) {
            const existingEvmWallet = await this.adminWalletRepository.findOne({
                where: [
                    { blockchain: 'ethereum', isActive: true },
                    { blockchain: 'bsc', isActive: true }
                ]
            });

            if (existingEvmWallet) {
                // Reuse the existing key but create new wallet entry
                const wallet = this.adminWalletRepository.create({
                    blockchain,
                    network,
                    address: existingEvmWallet.address, // Same address for all EVM chains
                    keyId: existingEvmWallet.keyId,     // Reuse the same key
                    type,
                    isActive: true
                });

                return this.adminWalletRepository.save(wallet);
            }
        }

        // If no existing EVM wallet or non-EVM chain, generate new wallet
        const { address, keyId } = await this.keyManagementService.generateWallet(
            adminId,
            blockchain,
            network,
            'admin'
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