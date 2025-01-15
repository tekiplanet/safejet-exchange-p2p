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
    if (updateSettingsDto.currency) {
      const isValid = await this.currenciesService.isValidCurrency(
        updateSettingsDto.currency,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid currency code');
      }
    }

    const settings = await this.getSettings(userId);
    Object.assign(settings, updateSettingsDto);
    return this.settingsRepository.save(settings);
  }
} 