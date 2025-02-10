import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasTankWallet } from '../entities/gas-tank-wallet.entity';
import { KeyManagementService } from '../key-management.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GasTankWalletService {
    private readonly logger = new Logger(GasTankWalletService.name);
    private readonly supportedChains = ['ethereum', 'bsc', 'bitcoin', 'trx', 'xrp'];
    private readonly networks = ['mainnet', 'testnet'];

    constructor(
        @InjectRepository(GasTankWallet)
        private gasTankWalletRepository: Repository<GasTankWallet>,
        private keyManagementService: KeyManagementService,
        private configService: ConfigService,
    ) {}

    async findAll(): Promise<GasTankWallet[]> {
        return this.gasTankWalletRepository.find();
    }

    async scanMissing() {
        const existingWallets = await this.gasTankWalletRepository.find();
        const missing: Array<{ blockchain: string; network: string }> = [];

        for (const blockchain of this.supportedChains) {
            for (const network of this.networks) {
                const exists = existingWallets.some(
                    wallet => wallet.blockchain === blockchain && wallet.network === network
                );

                if (!exists) {
                    missing.push({ blockchain, network });
                }
            }
        }

        return { missing };
    }

    async create(createWalletDto: { blockchain: string; network: string; type: string }) {
        try {
            if (['ethereum', 'bsc'].includes(createWalletDto.blockchain.toLowerCase())) {
                const existingEvmWallet = await this.gasTankWalletRepository.findOne({
                    where: [
                        { blockchain: 'ethereum', isActive: true },
                        { blockchain: 'bsc', isActive: true }
                    ]
                });

                if (existingEvmWallet) {
                    const wallet = this.gasTankWalletRepository.create({
                        blockchain: createWalletDto.blockchain,
                        network: createWalletDto.network,
                        address: existingEvmWallet.address,
                        keyId: existingEvmWallet.keyId,
                        type: 'gas_tank',
                        isActive: true
                    });

                    return this.gasTankWalletRepository.save(wallet);
                }
            }

            const { address, keyId } = await this.keyManagementService.generateWallet(
                'system',
                createWalletDto.blockchain,
                createWalletDto.network,
                'admin'
            );

            const wallet = this.gasTankWalletRepository.create({
                blockchain: createWalletDto.blockchain,
                network: createWalletDto.network,
                address,
                keyId,
                type: 'gas_tank',
                isActive: true
            });

            return this.gasTankWalletRepository.save(wallet);
        } catch (error) {
            this.logger.error(`Failed to create gas tank wallet: ${error.message}`);
            throw error;
        }
    }
} 