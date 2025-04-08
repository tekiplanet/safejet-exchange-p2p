import { Controller, Get, Patch, Body, UseGuards, Logger } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PlatformSettings } from '../platform/entities/platform-settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
    private readonly logger = new Logger(AdminSettingsController.name);

    constructor(
        @InjectRepository(PlatformSettings)
        private platformSettingsRepository: Repository<PlatformSettings>,
    ) {}

    @Get('contact')
    async getContactSettings() {
        this.logger.log('Fetching contact settings');
        const contactSettings = await this.platformSettingsRepository.find({
            where: {
                category: 'contact',
            },
        });
        this.logger.log(`Found ${contactSettings.length} contact settings`);
        return contactSettings;
    }

    @Patch('contact')
    async updateContactSettings(
        @Body('settings') settings: { key: string; value: string }[],
    ) {
        this.logger.log('Updating contact settings with data:', JSON.stringify(settings));
        
        try {
            const updates = settings.map(async (setting) => {
                this.logger.log(`Processing setting: ${setting.key} = ${setting.value}`);
                
                const existingSetting = await this.platformSettingsRepository.findOne({
                    where: { key: setting.key, category: 'contact' },
                });

                if (existingSetting) {
                    this.logger.log(`Updating existing setting: ${setting.key}`);
                    existingSetting.value = setting.value;
                    return this.platformSettingsRepository.save(existingSetting);
                } else {
                    this.logger.log(`Creating new setting: ${setting.key}`);
                    const newSetting = this.platformSettingsRepository.create({
                        key: setting.key,
                        value: setting.value,
                        category: 'contact'
                    });
                    return this.platformSettingsRepository.save(newSetting);
                }
            });

            await Promise.all(updates);
            this.logger.log('Successfully updated all contact settings');
            return { message: 'Settings updated successfully' };
        } catch (error) {
            this.logger.error('Error updating contact settings:', error);
            throw error;
        }
    }
} 