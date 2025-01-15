import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PTraderSettings } from './entities/p2p-trader-settings.entity';
import { UpdateP2PSettingsDto } from './dto/update-p2p-settings.dto';
import { CurrenciesService } from '../currencies/currencies.service';

@Injectable()
export class P2PSettingsService {
  constructor(
    @InjectRepository(P2PTraderSettings)
    private readonly settingsRepository: Repository<P2PTraderSettings>,
    private readonly currenciesService: CurrenciesService,
  ) {}

  async getSettings(userId: string): Promise<P2PTraderSettings> {
    const settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings if none exist
      const newSettings = this.settingsRepository.create({ userId });
      return this.settingsRepository.save(newSettings);
    }

    return settings;
  }

  async updateSettings(
    userId: string,
    updateSettingsDto: UpdateP2PSettingsDto,
  ): Promise<P2PTraderSettings> {
    // Get the key and value from the DTO
    const [[key, value]] = Object.entries(updateSettingsDto);

    // Validate currency if that's what's being updated
    if (key === 'currency') {
      const isValid = await this.currenciesService.isValidCurrency(value);
      if (!isValid) {
        throw new BadRequestException('Invalid currency code');
      }
    }

    // Get current settings
    const settings = await this.getSettings(userId);

    // Update only the specific setting
    settings[key] = value;

    // Save and return updated settings
    return this.settingsRepository.save(settings);
  }
} 