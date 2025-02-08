import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminWallet } from '../entities/admin-wallet.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletKey } from '../entities/wallet-key.entity';
import { Deposit } from '../entities/deposit.entity';
import { KeyManagementService } from '../key-management.service';
import { AdminWalletService } from './admin-wallet.service';
import { ConfigService } from '@nestjs/config';
import { providers, Contract, utils } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
const TronWeb = require('tronweb');
import { Client } from 'xrpl';

@Injectable()
export class WalletSweepingService {
    private readonly logger = new Logger(WalletSweepingService.name);

    constructor(
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(WalletKey)
        private walletKeyRepository: Repository<WalletKey>,
        private keyManagementService: KeyManagementService,
        private adminWalletService: AdminWalletService,
        private configService: ConfigService,
    ) {}

    async sweepDeposit(deposit: Deposit): Promise<boolean> {
        try {
            switch (deposit.blockchain) {
                case 'ethereum':
                case 'bsc':
                    return await this.sweepEvmDeposit(deposit);
                case 'bitcoin':
                    return await this.sweepBitcoinDeposit(deposit);
                case 'trx':
                    return await this.sweepTronDeposit(deposit);
                case 'xrp':
                    return await this.sweepXrpDeposit(deposit);
                default:
                    this.logger.error(`Unsupported blockchain: ${deposit.blockchain}`);
                    return false;
            }
        } catch (error) {
            this.logger.error(`Error sweeping deposit ${deposit.id}: ${error.message}`);
            return false;
        }
    }

    private async sweepEvmDeposit(deposit: Deposit): Promise<boolean> {
        // Implementation coming soon
        return false;
    }

    private async sweepBitcoinDeposit(deposit: Deposit): Promise<boolean> {
        // Implementation coming soon
        return false;
    }

    private async sweepTronDeposit(deposit: Deposit): Promise<boolean> {
        // Implementation coming soon
        return false;
    }

    private async sweepXrpDeposit(deposit: Deposit): Promise<boolean> {
        // Implementation coming soon
        return false;
    }

    private async getAdminWallet(blockchain: string, network: string): Promise<AdminWallet> {
        const adminWallet = await this.adminWalletRepository.findOne({
            where: {
                blockchain,
                network,
                isActive: true,
                type: 'hot'  // We'll use hot wallet for automated sweeping
            }
        });

        if (!adminWallet) {
            throw new Error(`No active admin wallet found for ${blockchain} ${network}`);
        }

        return adminWallet;
    }

    private async getWalletWithKey(walletId: string): Promise<{ wallet: Wallet; privateKey: string }> {
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId }
        });

        if (!wallet) {
            throw new Error(`Wallet not found: ${walletId}`);
        }

        const walletKey = await this.walletKeyRepository.findOne({
            where: { id: wallet.keyId }
        });

        if (!walletKey) {
            throw new Error(`Wallet key not found for wallet: ${walletId}`);
        }

        const privateKey = await this.keyManagementService.decryptPrivateKey(
            walletKey.encryptedPrivateKey,
            walletKey.userId
        );

        return { wallet, privateKey };
    }
} 