import { Controller, Post, UseGuards, Get, Body, HttpException, HttpStatus, Header } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DepositTrackingService } from '../wallet/services/deposit-tracking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemSettings } from '../wallet/entities/system-settings.entity';
import { Repository } from 'typeorm';

@Controller('admin/deposits')
@UseGuards(AdminGuard)
export class AdminDepositController {
  constructor(
    private readonly depositTrackingService: DepositTrackingService,
    @InjectRepository(SystemSettings)
    private systemSettingsRepository: Repository<SystemSettings>,
  ) {}

  @Get('chain-blocks')
  @Header('Content-Type', 'application/json')
  async getChainBlocks() {
    try {
      console.log('Fetching chain blocks...');
      const blocks = {
        eth_mainnet: await this.depositTrackingService.getCurrentBlockHeight('eth', 'mainnet'),
        eth_testnet: await this.depositTrackingService.getCurrentBlockHeight('eth', 'testnet'),
        bsc_mainnet: await this.depositTrackingService.getCurrentBlockHeight('bsc', 'mainnet'),
        bsc_testnet: await this.depositTrackingService.getCurrentBlockHeight('bsc', 'testnet'),
        btc_mainnet: await this.depositTrackingService.getCurrentBlockHeight('btc', 'mainnet'),
        btc_testnet: await this.depositTrackingService.getCurrentBlockHeight('btc', 'testnet'),
        trx_mainnet: await this.depositTrackingService.getCurrentBlockHeight('trx', 'mainnet'),
        trx_testnet: await this.depositTrackingService.getCurrentBlockHeight('trx', 'testnet'),
        xrp_mainnet: await this.depositTrackingService.getCurrentBlockHeight('xrp', 'mainnet'),
        xrp_testnet: await this.depositTrackingService.getCurrentBlockHeight('xrp', 'testnet'),
      };

      // console.log('Current blocks:', blocks);

      // Get saved values from system settings
      const savedBlocks = await Promise.all(
        Object.keys(blocks).map(async (chain) => {
          const setting = await this.systemSettingsRepository.findOne({
            where: { key: `start_block_${chain}` }
          });
          return { chain, value: setting?.value };
        })
      );

      // console.log('Saved blocks:', savedBlocks);

      const response = {
        currentBlocks: blocks,
        savedBlocks: Object.fromEntries(
          savedBlocks.map(({ chain, value }) => [chain, value])
        )
      };

      // console.log('Sending response:', response);
      return response;
    } catch (error: unknown) {
      console.error('Error in getChainBlocks:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Error fetching chain blocks: ${message}`,
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
} 