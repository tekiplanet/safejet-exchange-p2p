import { Controller, Get, Patch, Body, UseGuards, Logger } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PlatformSettings } from '../platform/entities/platform-settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';

interface EnvironmentSettings {
    smtp: {
        host: string;
        port: string;
        user: string;
        password: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    kyc: {
        sumsubAppToken: string;
        sumsubSecretKey: string;
        sumsubWebhookSecret: string;
        sumsubWebhookUrl: string;
    };
    blockchain: {
        confirmations: {
            ethereum: string;
            bsc: string;
            bitcoin: string;
            tron: string;
            xrp: string;
        };
        minimumBalances: {
            eth: string;
            bnb: string;
            trx: string;
            xrp: string;
        };
        tronFees: {
            tokenFeeLimit: string;
            minFeeBalance: string;
        };
        rpc: {
            ethereum: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            bsc: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            bitcoin: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
            tron: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
                apiKey: string;
            };
            xrp: {
                mainnet: string;
                mainnetFallback: string;
                testnet: string;
                testnetFallback: string;
            };
        };
        other: {
            cryptocompareApiKey: string;
        };
    };
}

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
    private readonly logger = new Logger(AdminSettingsController.name);
    private readonly envPath: string;

    constructor(
        @InjectRepository(PlatformSettings)
        private platformSettingsRepository: Repository<PlatformSettings>,
    ) {
        this.envPath = path.resolve(process.cwd(), '.env');
    }

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

    @Get('environment')
    async getEnvironmentSettings(): Promise<EnvironmentSettings> {
        this.logger.log('Fetching environment settings from .env');
        
        try {
            const envContent = await fs.readFile(this.envPath, 'utf8');
            const envVars = this.parseEnvFile(envContent);

            return {
                smtp: {
                    host: envVars['SMTP_HOST'] || '',
                    port: envVars['SMTP_PORT'] || '',
                    user: envVars['SMTP_USER'] || '',
                    password: envVars['SMTP_PASSWORD'] || '',
                },
                twilio: {
                    accountSid: envVars['TWILIO_ACCOUNT_SID'] || '',
                    authToken: envVars['TWILIO_AUTH_TOKEN'] || '',
                    phoneNumber: envVars['TWILIO_PHONE_NUMBER'] || '',
                },
                kyc: {
                    sumsubAppToken: envVars['SUMSUB_APP_TOKEN'] || '',
                    sumsubSecretKey: envVars['SUMSUB_SECRET_KEY'] || '',
                    sumsubWebhookSecret: envVars['SUMSUB_WEBHOOK_SECRET'] || '',
                    sumsubWebhookUrl: envVars['SUMSUB_WEBHOOK_URL'] || '',
                },
                blockchain: {
                    confirmations: {
                        ethereum: envVars['ETHEREUM_MAINNET_CONFIRMATIONS'] || '',
                        bsc: envVars['BSC_MAINNET_CONFIRMATIONS'] || '',
                        bitcoin: envVars['BITCOIN_MAINNET_CONFIRMATIONS'] || '',
                        tron: envVars['TRON_MAINNET_CONFIRMATIONS'] || '',
                        xrp: envVars['XRP_MAINNET_CONFIRMATIONS'] || '',
                    },
                    minimumBalances: {
                        eth: envVars['ETH_MINIMUM_BALANCE'] || '',
                        bnb: envVars['BNB_MINIMUM_BALANCE'] || '',
                        trx: envVars['TRX_MINIMUM_BALANCE'] || '',
                        xrp: envVars['XRP_MINIMUM_BALANCE'] || '',
                    },
                    tronFees: {
                        tokenFeeLimit: envVars['TRX_TOKEN_FEE_LIMIT'] || '',
                        minFeeBalance: envVars['TRX_MIN_FEE_BALANCE'] || '',
                    },
                    rpc: {
                        ethereum: {
                            mainnet: envVars['ETHEREUM_MAINNET_RPC'] || '',
                            mainnetFallback: envVars['ETHEREUM_MAINNET_RPC_FALLBACK'] || '',
                            testnet: envVars['ETHEREUM_TESTNET_RPC'] || '',
                            testnetFallback: envVars['ETHEREUM_TESTNET_RPC_FALLBACK'] || '',
                        },
                        bsc: {
                            mainnet: envVars['BSC_MAINNET_RPC'] || '',
                            mainnetFallback: envVars['BSC_MAINNET_RPC_FALLBACK'] || '',
                            testnet: envVars['BSC_TESTNET_RPC'] || '',
                            testnetFallback: envVars['BSC_TESTNET_RPC_FALLBACK'] || '',
                        },
                        bitcoin: {
                            mainnet: envVars['BITCOIN_MAINNET_RPC'] || '',
                            mainnetFallback: envVars['BITCOIN_MAINNET_RPC_FALLBACK'] || '',
                            testnet: envVars['BITCOIN_TESTNET_RPC'] || '',
                            testnetFallback: envVars['BITCOIN_TESTNET_RPC_FALLBACK'] || '',
                        },
                        tron: {
                            mainnet: envVars['TRON_MAINNET_API'] || '',
                            mainnetFallback: envVars['TRON_MAINNET_API_FALLBACK'] || '',
                            testnet: envVars['TRON_TESTNET_API'] || '',
                            testnetFallback: envVars['TRON_TESTNET_API_FALLBACK'] || '',
                            apiKey: envVars['TRON_API_KEY'] || '',
                        },
                        xrp: {
                            mainnet: envVars['XRP_MAINNET_RPC'] || '',
                            mainnetFallback: envVars['XRP_MAINNET_RPC_FALLBACK'] || '',
                            testnet: envVars['XRP_TESTNET_RPC'] || '',
                            testnetFallback: envVars['XRP_TESTNET_RPC_FALLBACK'] || '',
                        },
                    },
                    other: {
                        cryptocompareApiKey: envVars['CRYPTOCOMPARE_API_KEY'] || '',
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error reading .env file:', error);
            throw error;
        }
    }

    @Patch('environment')
    async updateEnvironmentSettings(@Body() settings: EnvironmentSettings) {
        this.logger.log('Updating environment settings in .env');
        
        try {
            const envContent = await fs.readFile(this.envPath, 'utf8');
            const envVars = this.parseEnvFile(envContent);

            // Update environment variables
            const updates = {
                // SMTP Settings
                SMTP_HOST: settings.smtp.host,
                SMTP_PORT: settings.smtp.port,
                SMTP_USER: settings.smtp.user,
                SMTP_PASSWORD: settings.smtp.password,

                // Twilio Settings
                TWILIO_ACCOUNT_SID: settings.twilio.accountSid,
                TWILIO_AUTH_TOKEN: settings.twilio.authToken,
                TWILIO_PHONE_NUMBER: settings.twilio.phoneNumber,

                // KYC Settings
                SUMSUB_APP_TOKEN: settings.kyc.sumsubAppToken,
                SUMSUB_SECRET_KEY: settings.kyc.sumsubSecretKey,
                SUMSUB_WEBHOOK_SECRET: settings.kyc.sumsubWebhookSecret,
                SUMSUB_WEBHOOK_URL: settings.kyc.sumsubWebhookUrl,

                // Blockchain Settings - Confirmations
                ETHEREUM_MAINNET_CONFIRMATIONS: settings.blockchain.confirmations.ethereum,
                BSC_MAINNET_CONFIRMATIONS: settings.blockchain.confirmations.bsc,
                BITCOIN_MAINNET_CONFIRMATIONS: settings.blockchain.confirmations.bitcoin,
                TRON_MAINNET_CONFIRMATIONS: settings.blockchain.confirmations.tron,
                XRP_MAINNET_CONFIRMATIONS: settings.blockchain.confirmations.xrp,

                // Blockchain Settings - Minimum Balances
                ETH_MINIMUM_BALANCE: settings.blockchain.minimumBalances.eth,
                BNB_MINIMUM_BALANCE: settings.blockchain.minimumBalances.bnb,
                TRX_MINIMUM_BALANCE: settings.blockchain.minimumBalances.trx,
                XRP_MINIMUM_BALANCE: settings.blockchain.minimumBalances.xrp,

                // Blockchain Settings - Tron Fees
                TRX_TOKEN_FEE_LIMIT: settings.blockchain.tronFees.tokenFeeLimit,
                TRX_MIN_FEE_BALANCE: settings.blockchain.tronFees.minFeeBalance,

                // Blockchain Settings - RPC URLs
                // Ethereum
                ETHEREUM_MAINNET_RPC: settings.blockchain.rpc.ethereum.mainnet,
                ETHEREUM_MAINNET_RPC_FALLBACK: settings.blockchain.rpc.ethereum.mainnetFallback,
                ETHEREUM_TESTNET_RPC: settings.blockchain.rpc.ethereum.testnet,
                ETHEREUM_TESTNET_RPC_FALLBACK: settings.blockchain.rpc.ethereum.testnetFallback,

                // BSC
                BSC_MAINNET_RPC: settings.blockchain.rpc.bsc.mainnet,
                BSC_MAINNET_RPC_FALLBACK: settings.blockchain.rpc.bsc.mainnetFallback,
                BSC_TESTNET_RPC: settings.blockchain.rpc.bsc.testnet,
                BSC_TESTNET_RPC_FALLBACK: settings.blockchain.rpc.bsc.testnetFallback,

                // Bitcoin
                BITCOIN_MAINNET_RPC: settings.blockchain.rpc.bitcoin.mainnet,
                BITCOIN_MAINNET_RPC_FALLBACK: settings.blockchain.rpc.bitcoin.mainnetFallback,
                BITCOIN_TESTNET_RPC: settings.blockchain.rpc.bitcoin.testnet,
                BITCOIN_TESTNET_RPC_FALLBACK: settings.blockchain.rpc.bitcoin.testnetFallback,

                // Tron
                TRON_MAINNET_API: settings.blockchain.rpc.tron.mainnet,
                TRON_MAINNET_API_FALLBACK: settings.blockchain.rpc.tron.mainnetFallback,
                TRON_TESTNET_API: settings.blockchain.rpc.tron.testnet,
                TRON_TESTNET_API_FALLBACK: settings.blockchain.rpc.tron.testnetFallback,
                TRON_API_KEY: settings.blockchain.rpc.tron.apiKey,

                // XRP
                XRP_MAINNET_RPC: settings.blockchain.rpc.xrp.mainnet,
                XRP_MAINNET_RPC_FALLBACK: settings.blockchain.rpc.xrp.mainnetFallback,
                XRP_TESTNET_RPC: settings.blockchain.rpc.xrp.testnet,
                XRP_TESTNET_RPC_FALLBACK: settings.blockchain.rpc.xrp.testnetFallback,

                // Other API Keys
                CRYPTOCOMPARE_API_KEY: settings.blockchain.other.cryptocompareApiKey,
            };

            // Update existing values while preserving comments and formatting
            let newContent = envContent;
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined && value !== '') {
                    const regex = new RegExp(`^${key}=.*$`, 'm');
                    if (regex.test(newContent)) {
                        // Update existing variable
                        newContent = newContent.replace(regex, `${key}=${this.escapeEnvValue(value)}`);
                    } else {
                        // Add new variable at the end
                        newContent += `\n${key}=${this.escapeEnvValue(value)}`;
                    }
                }
            }

            // Create backup of current .env
            const backupPath = `${this.envPath}.backup.${Date.now()}`;
            await fs.copyFile(this.envPath, backupPath);

            // Write updated content
            await fs.writeFile(this.envPath, newContent, 'utf8');

            return { 
                message: 'Environment settings updated successfully',
                backup: backupPath
            };
        } catch (error) {
            this.logger.error('Error updating .env file:', error);
            throw error;
        }
    }

    private parseEnvFile(content: string): { [key: string]: string } {
        const result: { [key: string]: string } = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    // Remove quotes if present
                    result[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            }
        }

        return result;
    }

    private escapeEnvValue(value: string): string {
        // If value contains spaces or special characters, wrap in quotes
        if (/[\s"'`$&|<>^;,\(\)\\]/.test(value)) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }
} 