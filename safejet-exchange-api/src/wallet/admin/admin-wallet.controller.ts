import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminWallet } from '../entities/admin-wallet.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeyManagementService } from '../key-management.service';

@Controller('admin/wallets')
@UseGuards(AdminGuard)
export class AdminWalletController {
    constructor(
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        private keyManagementService: KeyManagementService
    ) {}

    @Get()
    async getAdminWallets() {
        return this.adminWalletRepository.find();
    }

    @Post()
    async createAdminWallet(
        @Body() data: {
            blockchain: string;
            network: string;
            type: 'hot' | 'cold';
        }
    ) {
        // Generate wallet using existing key management service
        const { address, keyId } = await this.keyManagementService.generateWallet(
            'admin',
            data.blockchain,
            data.network
        );

        const adminWallet = this.adminWalletRepository.create({
            ...data,
            address,
            keyId,
        });

        return this.adminWalletRepository.save(adminWallet);
    }
} 