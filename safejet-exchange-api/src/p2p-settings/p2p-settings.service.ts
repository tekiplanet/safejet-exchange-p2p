import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { P2PTraderSettings } from './entities/p2p-trader-settings.entity';
import { UpdateP2PSettingsDto } from './dto/update-p2p-settings.dto';
import { CurrenciesService } from '../currencies/currencies.service';
import { UpdateAutoResponsesDto } from './dto/update-auto-responses.dto';

@Injectable()
export class P2PSettingsService {
  constructor(
    @InjectRepository(P2PTraderSettings)
    private readonly settingsRepository: Repository<P2PTraderSettings>,
    private readonly currenciesService: CurrenciesService,
  ) {}

  async getSettings(userId: string): Promise<P2PTraderSettings> {
    try {
      console.log('Getting settings for user:', userId);
      const settings = await this.settingsRepository.findOne({
        where: { userId },
      });
      console.log('Found settings:', settings);

      if (!settings) {
        console.log('No settings found, creating default settings');
        const newSettings = this.settingsRepository.create({ userId });
        const savedSettings = await this.settingsRepository.save(newSettings);
        // console.log('Created default settings:', savedSettings);
        return savedSettings;
      }

      return settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  async updateSettings(
    userId: string,
    updateSettingsDto: UpdateP2PSettingsDto,
  ): Promise<P2PTraderSettings> {
    try {
      console.log('Updating settings for user:', userId, 'with data:', updateSettingsDto);
      
      // Get current settings
      const settings = await this.getSettings(userId);
      
      // Validate and update the setting
      if ('currency' in updateSettingsDto) {
        const isValid = await this.currenciesService.isValidCurrency(updateSettingsDto.currency);
        if (!isValid) {
          throw new BadRequestException('Invalid currency code');
        }
        settings.currency = updateSettingsDto.currency;
      }
      
      if ('autoAcceptOrders' in updateSettingsDto) {
        settings.autoAcceptOrders = updateSettingsDto.autoAcceptOrders;
      }
      
      if ('onlyVerifiedUsers' in updateSettingsDto) {
        settings.onlyVerifiedUsers = updateSettingsDto.onlyVerifiedUsers;
      }
      
      if ('showOnlineStatus' in updateSettingsDto) {
        settings.showOnlineStatus = updateSettingsDto.showOnlineStatus;
      }
      
      if ('enableInstantTrade' in updateSettingsDto) {
        settings.enableInstantTrade = updateSettingsDto.enableInstantTrade;
      }
      
      if ('timezone' in updateSettingsDto) {
        settings.timezone = updateSettingsDto.timezone;
      }

      console.log('Saving updated settings:', settings);
      return this.settingsRepository.save(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async updateAutoResponses(
    userId: string,
    updateDto: UpdateAutoResponsesDto,
  ): Promise<P2PTraderSettings> {
    try {
      const settings = await this.getSettings(userId);
      settings.autoResponses = updateDto.autoResponses;
      return this.settingsRepository.save(settings);
    } catch (error) {
      console.error('Error updating auto responses:', error);
      throw error;
    }
  }
} 