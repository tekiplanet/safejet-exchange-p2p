import { Controller, Post, UseGuards, Get, Body, HttpException, HttpStatus, Header, Param } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DepositTrackingService } from '../wallet/services/deposit-tracking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemSettings } from '../wallet/entities/system-settings.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@Controller('admin/deposits')
@UseGuards(AdminGuard)
export class AdminDepositController {
  private readonly logger = new Logger(AdminDepositController.name);

  constructor(
    private readonly depositTrackingService: DepositTrackingService,
    @InjectRepository(SystemSettings)
    private systemSettingsRepository: Repository<SystemSettings>,
  ) {}

  @Get('chain-blocks')
  @Header('Content-Type', 'application/json')
  async getAllChainBlocks() {
    try {
      const blockInfo = await this.depositTrackingService.getBlockInfo();
      this.logger.debug('Block info received:', blockInfo);
      
      if (!blockInfo) {
        throw new HttpException('No block info available', HttpStatus.NOT_FOUND);
      }

      return {
        currentBlocks: blockInfo.currentBlocks || {},
        savedBlocks: blockInfo.savedBlocks || {},
        lastProcessedBlocks: blockInfo.lastProcessedBlocks || {}
      };
    } catch (error) {
      this.logger.error('Error getting chain blocks:', error);
      throw new HttpException(
        error.message || 'Failed to get chain blocks', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('chain-blocks/:chain/:network')
  async getChainBlocks(
    @Param('chain') chain: string,
    @Param('network') network: string
  ) {
    try {
      // Get current block height
      const currentBlock = await this.depositTrackingService.getCurrentBlockHeight(chain, network);

      // Get saved block
      const savedBlock = await this.systemSettingsRepository.findOne({
        where: { key: `start_block_${chain}_${network}` }
      });

      // Get last processed block
      const lastProcessed = await this.systemSettingsRepository.findOne({
        where: { key: `last_processed_block_${chain}_${network}` }
      });

      return {
        currentBlock,
        savedBlock: savedBlock?.value,
        lastProcessedBlock: lastProcessed?.value
      };
    } catch (error) {
      this.logger.error(`Error getting chain blocks for ${chain}_${network}:`, error);
      throw new HttpException(
        `Failed to get chain blocks for ${chain}_${network}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('set-start-block')
  async setStartBlock(
    @Body() dto: { 
      chain: string;
      network: string;
      startBlock: number;
    }
  ) {
    try {
      const key = `start_block_${dto.chain}_${dto.network}`;
      
      // Validate that block number is not higher than current block
      const currentBlock = await this.depositTrackingService.getCurrentBlockHeight(
        dto.chain,
        dto.network
      );
      
      if (dto.startBlock > currentBlock) {
        throw new HttpException(
          'Start block cannot be higher than current block',
          HttpStatus.BAD_REQUEST
        );
      }

      await this.systemSettingsRepository.upsert(
        {
          key,
          value: dto.startBlock.toString(),
        },
        ['key']
      );

      return { 
        message: `Start block for ${dto.chain} ${dto.network} set to ${dto.startBlock}`,
        currentBlock
      };
    } catch (error) {
      throw new HttpException(
        `Error setting start block: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('start-monitoring')
  async startMonitoring() {
    try {
      await this.depositTrackingService.startMonitoring();
      return { message: 'Deposit monitoring started successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to start monitoring: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stop-monitoring')
  async stopMonitoring() {
    try {
      await this.depositTrackingService.stopMonitoring();
      return { message: 'Deposit monitoring stopped successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to stop monitoring: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('monitoring-status')
  async getMonitoringStatus() {
    try {
      const status = await this.depositTrackingService.getMonitoringStatus();
      this.logger.debug('Monitoring status response:', status);
      return status;
    } catch (error) {
      this.logger.error('Error getting monitoring status:', error);
      throw error;
    }
  }

  @Post('start-chain-monitoring')
  async startChainMonitoring(
    @Body() dto: { 
      chain: string; 
      network: string;
      startPoint?: 'current' | 'start' | 'last';
      startBlock?: string;
    }
  ) {
    try {
      this.logger.debug('Starting chain monitoring with params:', dto);
      
      const success = await this.depositTrackingService.startChainMonitoring(
        dto.chain, 
        dto.network, 
        dto.startPoint,
        dto.startBlock
      );

      if (!success) {
        throw new Error('Failed to start monitoring');
      }

      const status = await this.depositTrackingService.getChainStatus();
      this.logger.debug(`Chain status after start:`, status);

      return { 
        message: `Started monitoring ${dto.chain} ${dto.network}`,
        status: status[dto.chain]?.[dto.network]
      };
    } catch (error) {
      this.logger.error(`Failed to start chain monitoring:`, error);
      throw new HttpException(
        `Failed to start chain monitoring: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stop-chain-monitoring')
  async stopChainMonitoring(
    @Body() dto: { chain: string; network: string }
  ) {
    try {
      await this.depositTrackingService.stopChainMonitoring(dto.chain, dto.network);
      return { message: `Stopped monitoring ${dto.chain} ${dto.network}` };
    } catch (error) {
      throw new HttpException(
        `Failed to stop chain monitoring: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('chain-status')
  async getChainStatus() {
    try {
      const status = this.depositTrackingService.getChainStatus();
      return { status };
    } catch (error) {
      throw new HttpException(
        `Failed to get chain status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}