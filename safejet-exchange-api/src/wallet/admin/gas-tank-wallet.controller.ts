import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';  // Correct path, matching other admin controllers
import { GasTankWalletService } from '../services/gas-tank-wallet.service';

@Controller('admin/gas-tank-wallets')
@UseGuards(AdminGuard)
export class GasTankWalletController {
    constructor(
        private readonly gasTankWalletService: GasTankWalletService
    ) {}

    @Get()
    async findAll() {
        return this.gasTankWalletService.findAll();
    }

    @Get('scan')
    async scanMissing() {
        return this.gasTankWalletService.scanMissing();
    }

    @Post()
    async create(@Body() createWalletDto: { blockchain: string; network: string; type: string }) {
        return this.gasTankWalletService.create(createWalletDto);
    }
} 