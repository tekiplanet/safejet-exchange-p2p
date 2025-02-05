import { Controller, Get, Put, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PTraderSettings } from '../p2p-settings/entities/p2p-trader-settings.entity';
import { AdminGuard } from '../auth/admin.guard';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

// DTO for updating P2P settings
class UpdateP2PSettingsDto {
    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    autoAcceptOrders?: boolean;

    @IsOptional()
    @IsBoolean()
    onlyVerifiedUsers?: boolean;

    @IsOptional()
    @IsBoolean()
    showOnlineStatus?: boolean;

    @IsOptional()
    @IsBoolean()
    enableInstantTrade?: boolean;

    @IsOptional()
    @IsString()
    timezone?: string;
}

@Controller('admin/p2p-trader-settings')
@UseGuards(AdminGuard)
export class AdminP2PTraderSettingsController {
    constructor(
        @InjectRepository(P2PTraderSettings)
        private p2pTraderSettingsRepository: Repository<P2PTraderSettings>,
    ) {}

    @Get(':userId')
    async getSettings(@Param('userId') userId: string) {
        console.log('Fetching P2P settings for user:', userId);
        const settings = await this.p2pTraderSettingsRepository.findOne({
            where: { userId }
        });

        console.log('Found settings:', settings);

        if (!settings) {
            throw new NotFoundException('P2P trader settings not found');
        }

        return settings;
    }

    @Put(':id')
    async updateSettings(
        @Param('id') id: string,
        @Body() updateDto: UpdateP2PSettingsDto
    ) {
        const settings = await this.p2pTraderSettingsRepository.findOne({
            where: { id }
        });

        if (!settings) {
            throw new NotFoundException('P2P trader settings not found');
        }

        Object.assign(settings, updateDto);
        const savedSettings = await this.p2pTraderSettingsRepository.save(settings);
        return savedSettings;
    }
} 