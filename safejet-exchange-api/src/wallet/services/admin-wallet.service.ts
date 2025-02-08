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

    // More methods for admin wallet management will be added here
} 