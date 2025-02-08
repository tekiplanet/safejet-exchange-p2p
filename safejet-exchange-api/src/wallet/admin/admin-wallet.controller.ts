import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminWallet } from '../entities/admin-wallet.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeyManagementService } from '../key-management.service';
import { AdminWalletService } from '../services/admin-wallet.service';

@Controller('admin/wallets')
@UseGuards(AdminGuard)
export class AdminWalletController {
    constructor(
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        private keyManagementService: KeyManagementService,
        private adminWalletService: AdminWalletService
    ) {}

    @Get()
    async getAdminWallets() {
        return this.adminWalletRepository.find({
            order: {
                blockchain: 'ASC',
                network: 'ASC'
            }
        });
    }

    @Get('scan')
    async scanMissingWallets() {
        return this.adminWalletService.scanMissingWallets();
    }

    @Post()
    async createAdminWallet(
        @Body() data: {
            blockchain: string;
            network: string;
            type: 'hot' | 'cold';
        }
    ) {
        return this.adminWalletService.createAdminWallet(
            data.blockchain,
            data.network,
            data.type
        );
    }
} 