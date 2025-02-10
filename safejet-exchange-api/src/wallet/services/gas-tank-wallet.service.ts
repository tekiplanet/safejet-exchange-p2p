import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasTankWallet } from '../entities/gas-tank-wallet.entity';
import { KeyManagementService } from '../key-management.service';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ethers } from 'ethers';
import axios from 'axios';

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
        @Inject(REQUEST) private request: Request
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
            if (!this.request.admin?.sub) {
                throw new Error('Admin ID not found in request');
            }

            const adminId = this.request.admin.sub;

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
                adminId,
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

    async getWalletBalance(id: string) {
        const wallet = await this.gasTankWalletRepository.findOne({ where: { id } });
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        try {
            // EVM chains (ETH, BSC)
            if (['ethereum', 'bsc'].includes(wallet.blockchain.toLowerCase())) {
                const provider = this.getEvmProvider(wallet.blockchain, wallet.network);
                const balance = await provider.getBalance(wallet.address);
                return {
                    balance: ethers.utils.formatEther(balance),
                    symbol: wallet.blockchain === 'ethereum' ? 'ETH' : 'BNB'
                };
            }

            // Bitcoin
            if (wallet.blockchain.toLowerCase() === 'bitcoin') {
                try {
                    const network = wallet.network === 'mainnet' ? 'main' : 'test3';
                    this.logger.debug(`Fetching BTC balance for address ${wallet.address} on ${network} network`);
                    
                    // Try mempool.space testnet API first
                    try {
                        const response = await axios.get(`https://mempool.space/testnet/api/address/${wallet.address}`);
                        this.logger.debug('Mempool API response:', response.data);
                        
                        const chainStats = response.data.chain_stats || { funded_txo_sum: 0, spent_txo_sum: 0 };
                        const mempoolStats = response.data.mempool_stats || { funded_txo_sum: 0, spent_txo_sum: 0 };
                        
                        const confirmedBalance = chainStats.funded_txo_sum - chainStats.spent_txo_sum;
                        const unconfirmedBalance = mempoolStats.funded_txo_sum - mempoolStats.spent_txo_sum;
                        const finalBalance = confirmedBalance + unconfirmedBalance;

                        return {
                            balance: (finalBalance / 100000000).toFixed(8),
                            symbol: 'BTC',
                            details: {
                                confirmed: (confirmedBalance / 100000000).toFixed(8),
                                unconfirmed: (unconfirmedBalance / 100000000).toFixed(8),
                                total_received: ((chainStats.funded_txo_sum + mempoolStats.funded_txo_sum) / 100000000).toFixed(8),
                                total_sent: ((chainStats.spent_txo_sum + mempoolStats.spent_txo_sum) / 100000000).toFixed(8)
                            }
                        };
                    } catch (mempoolError) {
                        // Fallback to BlockCypher if mempool.space fails
                        this.logger.debug('Mempool API failed, falling back to BlockCypher:', mempoolError.message);
                        
                        const response = await axios.get(`https://api.blockcypher.com/v1/btc/${network}/addrs/${wallet.address}`);
                        this.logger.debug('BlockCypher API response:', response.data);
                        
                        const finalBalance = response.data.final_balance;
                        if (typeof finalBalance !== 'number') {
                            throw new Error('Invalid balance format from BlockCypher API');
                        }

                        return {
                            balance: (finalBalance / 100000000).toFixed(8),
                            symbol: 'BTC',
                            details: {
                                confirmed: (response.data.balance / 100000000).toFixed(8),
                                unconfirmed: (response.data.unconfirmed_balance / 100000000).toFixed(8),
                                total_received: (response.data.total_received / 100000000).toFixed(8),
                                total_sent: (response.data.total_sent / 100000000).toFixed(8)
                            }
                        };
                    }
                } catch (error) {
                    this.logger.error('Bitcoin balance fetch error:', error.response?.data || error.message);
                    throw new Error(`Failed to fetch Bitcoin balance: ${error.message}`);
                }
            }

            // Tron
            if (wallet.blockchain.toLowerCase() === 'trx') {
                try {
                    const apiKey = this.configService.get<string>('TRON_API_KEY');
                    const apiUrl = this.configService.get<string>(`TRON_${wallet.network.toUpperCase()}_API`);
                    
                    this.logger.debug(`Fetching TRX balance for address ${wallet.address} on ${wallet.network}`);

                    // TRON Grid API endpoint
                    const response = await axios.get(`${apiUrl}/v1/accounts/${wallet.address}`, {
                        headers: { 
                            'TRON-PRO-API-KEY': apiKey,
                            'Accept': 'application/json'
                        }
                    });

                    this.logger.debug('TRON API response:', response.data);

                    // TRON API returns balance in SUN (1 TRX = 1,000,000 SUN)
                    const balance = response.data?.data?.[0]?.balance || 0;
                    const frozenBalance = response.data?.data?.[0]?.frozen
                        ?.reduce((sum: number, f: any) => sum + (f.frozen_balance || 0), 0) || 0;

                    return {
                        balance: ((balance + frozenBalance) / 1000000).toFixed(6), // Convert SUN to TRX with 6 decimals
                        symbol: 'TRX',
                        details: {
                            available: (balance / 1000000).toFixed(6),
                            frozen: (frozenBalance / 1000000).toFixed(6)
                        }
                    };
                } catch (error) {
                    this.logger.error('TRON balance fetch error:', error.response?.data || error.message);
                    
                    // Try fallback API if primary fails
                    try {
                        const fallbackUrl = this.configService.get<string>(`TRON_${wallet.network.toUpperCase()}_API_FALLBACK`);
                        const response = await axios.get(`${fallbackUrl}/v1/accounts/${wallet.address}`);
                        
                        const balance = response.data?.data?.[0]?.balance || 0;
                        const frozenBalance = response.data?.data?.[0]?.frozen
                            ?.reduce((sum: number, f: any) => sum + (f.frozen_balance || 0), 0) || 0;

                        return {
                            balance: ((balance + frozenBalance) / 1000000).toFixed(6),
                            symbol: 'TRX',
                            details: {
                                available: (balance / 1000000).toFixed(6),
                                frozen: (frozenBalance / 1000000).toFixed(6)
                            }
                        };
                    } catch (fallbackError) {
                        this.logger.error('TRON fallback API error:', fallbackError.response?.data || fallbackError.message);
                        throw new Error(`Failed to fetch TRON balance: ${error.message}`);
                    }
                }
            }

            // XRP
            if (wallet.blockchain.toLowerCase() === 'xrp') {
                try {
                    this.logger.debug(`Fetching XRP balance for address ${wallet.address} on ${wallet.network}`);
                    
                    // Use XRPL JSON-RPC API
                    const network = wallet.network === 'mainnet' 
                        ? 'https://xrplcluster.com'
                        : 'https://s.altnet.rippletest.net:51234';

                    const response = await axios.post(network, {
                        method: "account_info",
                        params: [{
                            account: wallet.address,
                            strict: true,
                            ledger_index: "current",
                            queue: true
                        }]
                    });

                    this.logger.debug('XRP API response:', response.data);

                    if (!response.data?.result?.account_data) {
                        return {
                            balance: "0.000000",
                            symbol: "XRP",
                            details: {
                                status: "Account not found or not activated"
                            }
                        };
                    }

                    const balance = response.data.result.account_data.Balance || "0";
                    const ownerCount = response.data.result.account_data.OwnerCount || 0;
                    const reserveBase = 10 + (2 * ownerCount); // Base reserve (10 XRP) + owner reserve (2 XRP per owned object)

                    return {
                        balance: (Number(balance) / 1000000).toFixed(6), // Convert drops to XRP
                        symbol: "XRP",
                        details: {
                            available: ((Number(balance) - reserveBase) / 1000000).toFixed(6),
                            reserve: (reserveBase / 1000000).toFixed(6),
                            total: (Number(balance) / 1000000).toFixed(6)
                        }
                    };
                } catch (error) {
                    this.logger.error('XRP balance fetch error:', error.response?.data || error.message);
                    
                    // Try alternative API
                    try {
                        const network = wallet.network === 'mainnet' 
                            ? 'https://xrpl.ws'  // Fallback mainnet
                            : 'https://testnet.xrpl-labs.com';  // Fallback testnet

                        const response = await axios.post(network, {
                            method: "account_info",
                            params: [{
                                account: wallet.address,
                                strict: true,
                                ledger_index: "current",
                                queue: true
                            }]
                        });

                        this.logger.debug('XRP Fallback API response:', response.data);

                        if (!response.data?.result?.account_data) {
                            return {
                                balance: "0.000000",
                                symbol: "XRP",
                                details: {
                                    status: "Account not found or not activated"
                                }
                            };
                        }

                        const balance = response.data.result.account_data.Balance || "0";
                        const ownerCount = response.data.result.account_data.OwnerCount || 0;
                        const reserveBase = 10 + (2 * ownerCount);

                        return {
                            balance: (Number(balance) / 1000000).toFixed(6),
                            symbol: "XRP",
                            details: {
                                available: ((Number(balance) - reserveBase) / 1000000).toFixed(6),
                                reserve: (reserveBase / 1000000).toFixed(6),
                                total: (Number(balance) / 1000000).toFixed(6)
                            }
                        };
                    } catch (fallbackError) {
                        this.logger.error('XRP fallback API error:', fallbackError.response?.data || fallbackError.message);
                        throw new Error(`Failed to fetch XRP balance: ${error.message}`);
                    }
                }
            }

            throw new Error(`Balance check not implemented for ${wallet.blockchain}`);
        } catch (error) {
            this.logger.error(`Failed to fetch balance: ${error.message}`);
            throw error;
        }
    }

    private getEvmProvider(blockchain: string, network: string) {
        const evmMappings: { [key: string]: string } = {
            'binance-smart-chain': 'bsc',
            'binance': 'bsc'
        };
        
        const chainKey = evmMappings[blockchain] || blockchain;
        const networkKey = network.toUpperCase();
        
        let rpcUrl: string;
        
        if (chainKey === 'ethereum') {
            rpcUrl = this.configService.get<string>(`ETHEREUM_${networkKey}_RPC`);
        } else if (chainKey === 'bsc') {
            rpcUrl = this.configService.get<string>(`BSC_${networkKey}_RPC`);
        } else {
            throw new Error(`Unsupported blockchain: ${blockchain}`);
        }

        if (!rpcUrl) {
            throw new Error(`No RPC URL configured for ${blockchain} ${network}`);
        }

        this.logger.debug(`Using RPC URL for ${blockchain} ${network}: ${rpcUrl}`);
        return new ethers.providers.JsonRpcProvider(rpcUrl);
    }
} 