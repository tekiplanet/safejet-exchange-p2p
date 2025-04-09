import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger, BadRequestException, NotFoundException, UnauthorizedException, Request } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../wallet/entities/withdrawal.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AdminWallet } from '../wallet/entities/admin-wallet.entity';
import { WalletKey } from '../wallet/entities/wallet-key.entity';
import { Token } from '../wallet/entities/token.entity';
import { KeyManagementService } from '../wallet/key-management.service';
import { ethers } from 'ethers';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { ConfigService } from '@nestjs/config';
import { Client } from 'xrpl';
import * as bcrypt from 'bcrypt';
import { Admin } from '../admin/entities/admin.entity';
const TronWeb = require('tronweb');

const ECPair = ECPairFactory(ecc);

interface XrpAccountInfoResponse {
  result: {
    account_data: {
      Balance: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  status?: string;
  type?: string;
  error?: string;
  error_message?: string;
}

interface XrpTxResponse {
  result: {
    meta: {
      TransactionResult: string;
      [key: string]: any;
    };
    hash: string;
    [key: string]: any;
  };
}

interface ProcessWithdrawalDto {
  status: 'completed' | 'failed' | 'cancelled';
  reason?: string;
  password: string;
  secretKey: string;
}

interface RequestWithAdmin extends Request {
  admin: {
    email: string;
    sub: string;
    type: string;
    iat: number;
    exp: number;
  }
}

@Controller('admin/withdrawals')
@UseGuards(AdminGuard)
export class AdminWithdrawalsController {
  private readonly logger = new Logger(AdminWithdrawalsController.name);

  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WalletBalance)
    private walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(AdminWallet)
    private adminWalletRepository: Repository<AdminWallet>,
    @InjectRepository(WalletKey)
    private walletKeyRepository: Repository<WalletKey>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private keyManagementService: KeyManagementService,
    private configService: ConfigService
  ) {}

  @Get()
  async getWithdrawals(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('blockchain') blockchain?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const query = this.withdrawalRepository.createQueryBuilder('withdrawal')
        .leftJoinAndSelect('withdrawal.user', 'user')
        .leftJoinAndSelect('withdrawal.token', 'token');

      if (search) {
        query.andWhere('(withdrawal.txHash ILIKE :search OR CAST(withdrawal.userId AS TEXT) ILIKE :search OR CAST(withdrawal.id AS TEXT) ILIKE :search OR user.email ILIKE :search)', {
          search: `%${search}%`
        });
      }

      if (status) {
        query.andWhere('withdrawal.status = :status', { status });
      }

      if (blockchain) {
        query.andWhere('withdrawal.network = :blockchain', { blockchain });
      }

      const [withdrawals, total] = await Promise.all([
        query
          .orderBy('withdrawal.createdAt', 'DESC')
          .skip(skip)
          .take(limit)
          .getMany(),
        query.getCount()
      ]);

      return {
        data: withdrawals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  }

  @Get(':id')
  async getWithdrawal(@Param('id') id: string): Promise<Withdrawal> {
    return this.withdrawalRepository.findOne({
      where: { id },
      relations: ['user', 'token']
    });
  }

  @Post(':id/process')
  async processWithdrawal(
    @Param('id') id: string,
    @Body() data: ProcessWithdrawalDto,
    @Request() req: RequestWithAdmin
  ) {
    this.logger.debug(`Processing withdrawal ${id} with status ${data.status}`);

    // Get admin secret key from .env
    const adminSecretKey = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecretKey) {
      throw new BadRequestException('Admin secret key not properly configured');
    }

    // Get admin from database using the authenticated admin's ID
    const adminId = req.admin?.sub;
    if (!adminId) {
      throw new UnauthorizedException('Admin ID not found in token');
    }

    const admin = await this.adminRepository.findOne({ 
      where: { id: adminId }
    });
    if (!admin) {
      throw new BadRequestException('Admin account not found');
    }

    // Validate password using bcrypt
    const isPasswordValid = await bcrypt.compare(data.password, admin.password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid admin password'
      };
    }

    // Validate secret key
    if (data.secretKey !== adminSecretKey) {
      return {
        success: false,
        message: 'Invalid secret key'
      };
    }

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['token']
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new BadRequestException(`Cannot process withdrawal in ${withdrawal.status} status`);
    }

    // If cancelling or failing, just update status
    if (data.status === 'failed' || data.status === 'cancelled') {
      withdrawal.status = data.status;
      if (data.reason) {
        withdrawal.metadata = {
          ...withdrawal.metadata,
          processingReason: data.reason
        };
      }

      // Refund the amount back to user's balance
      const balance = await this.walletBalanceRepository.findOne({
        where: {
          userId: withdrawal.userId,
          baseSymbol: withdrawal.token.baseSymbol,
          type: 'funding'
        }
      });

      if (balance) {
        const totalAmount = new Decimal(withdrawal.amount).plus(new Decimal(withdrawal.fee));
        balance.balance = new Decimal(balance.balance).plus(totalAmount).toString();
        await this.walletBalanceRepository.save(balance);
      }

      return this.withdrawalRepository.save(withdrawal);
    }

    // For completed status, we need to process the actual blockchain transaction
    try {
      // Find admin wallet for this blockchain/network
      const adminWallet = await this.adminWalletRepository.findOne({
        where: {
          blockchain: withdrawal.token.blockchain,
          network: withdrawal.network,
          isActive: true
        }
      });

      if (!adminWallet) {
        throw new BadRequestException(`No active admin wallet found for ${withdrawal.token.blockchain}/${withdrawal.network}`);
      }

      // Get admin wallet's private key
      const walletKey = await this.walletKeyRepository.findOne({
        where: { id: adminWallet.keyId }
      });

      if (!walletKey) {
        throw new BadRequestException('Admin wallet key not found');
      }

      // Get the decrypted private key
      const privateKey = await this.keyManagementService.decryptPrivateKey(
        walletKey.encryptedPrivateKey,
        walletKey.userId
      );

      // Process the withdrawal based on blockchain type
      let txHash: string;
      
      switch (withdrawal.token.blockchain) {
        case 'ethereum':
        case 'bsc':
          txHash = await this.processEvmWithdrawal(
            withdrawal,
            privateKey,
            adminWallet.address
          );
          break;
          
        case 'bitcoin':
          txHash = await this.processBitcoinWithdrawal(
            withdrawal,
            privateKey,
            adminWallet.address
          );
          break;
          
        case 'trx':
          txHash = await this.processTronWithdrawal(
            withdrawal,
            privateKey,
            adminWallet.address
          );
          break;
          
        case 'xrp':
          txHash = await this.processXrpWithdrawal(
            withdrawal,
            privateKey,
            adminWallet.address
          );
          break;
          
        default:
          throw new BadRequestException(`Unsupported blockchain: ${withdrawal.token.blockchain}`);
      }

      // Update withdrawal status
      withdrawal.status = 'completed';
      withdrawal.txHash = txHash;
      if (data.reason) {
        withdrawal.metadata = {
          ...withdrawal.metadata,
          processingReason: data.reason
        };
      }

      const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);
      return {
        success: true,
        data: savedWithdrawal
      };

    } catch (error) {
      this.logger.error(`Error processing withdrawal ${id}:`, error);
      throw new BadRequestException(`Failed to process withdrawal: ${error.message}`);
    }
  }

  private async processEvmWithdrawal(
    withdrawal: Withdrawal,
    privateKey: string,
    adminAddress: string
  ): Promise<string> {
    this.logger.debug(`Processing EVM withdrawal for ${withdrawal.id}`);
    this.logger.debug(`Withdrawal details: ${JSON.stringify({
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      metadata: withdrawal.metadata,
      address: withdrawal.address
    })}`);

    // Get RPC URL based on blockchain and network
    const rpcUrl = this.getRpcUrl(withdrawal.token.blockchain, withdrawal.network);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check admin wallet balance
    const balance = await provider.getBalance(adminAddress);
    
    // For token transfers, we only need enough for gas
    // For native transfers, we need enough for amount + gas
    const isNativeToken = !withdrawal.token.contractAddress;
    
    // Use receiveAmount from metadata instead of the full amount
    const receiveAmount = withdrawal.metadata?.receiveAmount;
    if (!receiveAmount) {
      throw new BadRequestException('Receive amount not found in withdrawal metadata');
    }

    this.logger.debug(`Using receive amount: ${receiveAmount} (original amount: ${withdrawal.amount})`);
    const amount = ethers.utils.parseUnits(receiveAmount.toString(), withdrawal.token.decimals);

    if (isNativeToken) {
      // For native token, check if we have enough balance
      if (balance.lt(amount)) {
        throw new BadRequestException('Insufficient balance in admin wallet');
      }

      this.logger.debug(`Sending native token transaction: ${JSON.stringify({
        to: withdrawal.address,
        value: ethers.utils.formatUnits(amount, withdrawal.token.decimals),
        from: adminAddress
      })}`);

      // Send native token
      const tx = await wallet.sendTransaction({
        to: withdrawal.address,
        value: amount,
        gasLimit: 21000 // Standard gas limit for ETH transfers
      });

      this.logger.debug(`Transaction sent with hash: ${tx.hash}`);
      return tx.hash;
    } else {
      // For tokens, we need the contract
      const tokenContract = new ethers.Contract(
        withdrawal.token.contractAddress,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function balanceOf(address account) view returns (uint256)'
        ],
        wallet
      );

      // Check token balance
      const tokenBalance = await tokenContract.balanceOf(adminAddress);
      if (tokenBalance.lt(amount)) {
        throw new BadRequestException('Insufficient token balance in admin wallet');
      }

      this.logger.debug(`Sending token transaction: ${JSON.stringify({
        token: withdrawal.token.contractAddress,
        to: withdrawal.address,
        amount: ethers.utils.formatUnits(amount, withdrawal.token.decimals),
        from: adminAddress
      })}`);

      // Estimate gas for token transfer
      const gasLimit = await tokenContract.estimateGas.transfer(withdrawal.address, amount);
      
      // Add 20% buffer to gas limit for safety
      const safeGasLimit = gasLimit.mul(120).div(100);

      // Send token
      const tx = await tokenContract.transfer(withdrawal.address, amount, {
        gasLimit: safeGasLimit
      });

      this.logger.debug(`Transaction sent with hash: ${tx.hash}`);
      return tx.hash;
    }
  }

  private getRpcUrl(blockchain: string, network: string): string {
    // Map blockchain names to environment variable prefixes
    const blockchainMap = {
      ethereum: 'ETHEREUM',
      bsc: 'BSC'
    };

    const prefix = blockchainMap[blockchain];
    if (!prefix) {
      throw new BadRequestException(`Unsupported blockchain: ${blockchain}`);
    }

    const envKey = `${prefix}_${network.toUpperCase()}_RPC`;
    const url = process.env[envKey];

    if (!url) {
      throw new BadRequestException(`No RPC URL configured for ${blockchain}/${network}`);
    }

    return url;
  }

  private async processBitcoinWithdrawal(
    withdrawal: Withdrawal,
    privateKey: string,
    adminAddress: string
  ): Promise<string> {
    this.logger.debug(`Processing Bitcoin withdrawal for ${withdrawal.id}`);
    
    // Get receiveAmount from metadata
    const receiveAmount = withdrawal.metadata?.receiveAmount;
    if (!receiveAmount) {
      throw new BadRequestException('Receive amount not found in withdrawal metadata');
    }
    this.logger.debug(`Using receive amount: ${receiveAmount} (original amount: ${withdrawal.amount})`);

    const network = withdrawal.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const networkPath = withdrawal.network === 'testnet' ? '/testnet' : '';

    // Get UTXOs for the admin wallet
    const utxosResponse = await axios.get(
      `https://mempool.space${networkPath}/api/address/${adminAddress}/utxo`
    );
    const utxos = utxosResponse.data;

    if (!utxos || utxos.length === 0) {
      throw new BadRequestException('No UTXOs found in admin wallet');
    }

    // Calculate total available balance
    const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const amountToSend = Math.floor(parseFloat(receiveAmount) * 1e8); // Convert BTC to satoshis using receiveAmount

    // Estimate fee (using a conservative estimate of 250 bytes * current fee rate)
    const feeResponse = await axios.get(
      `https://mempool.space${networkPath}/api/v1/fees/recommended`
    );
    const feeRate = feeResponse.data.hourFee; // Use hourFee for medium priority
    const estimatedFee = 250 * feeRate;

    // Check if we have enough balance
    if (totalBalance < amountToSend + estimatedFee) {
      throw new BadRequestException('Insufficient balance in admin wallet');
    }

    // Create and sign transaction
    const psbt = new bitcoin.Psbt({ network });
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network });

    // Sort UTXOs by value (descending) and use the minimum needed
    utxos.sort((a, b) => b.value - a.value);
    let inputAmount = 0;
    const inputUtxos = [];

    for (const utxo of utxos) {
      inputAmount += utxo.value;
      inputUtxos.push(utxo);
      if (inputAmount >= amountToSend + estimatedFee) break;
    }

    // Add inputs
    for (const utxo of inputUtxos) {
      const isSegwit = adminAddress.startsWith('bc1') || adminAddress.startsWith('tb1');
      
      if (isSegwit) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: bitcoin.address.toOutputScript(adminAddress, network),
            value: utxo.value
          }
        });
      } else {
        const txHex = await this.getBitcoinTransactionHex(utxo.txid, withdrawal.network);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex')
        });
      }
    }

    // Add recipient output
    psbt.addOutput({
      address: withdrawal.address,
      value: amountToSend
    });

    // Add change output if needed
    const changeAmount = inputAmount - amountToSend - estimatedFee;
    if (changeAmount > 546) { // Dust threshold
      psbt.addOutput({
        address: adminAddress,
        value: changeAmount
      });
    }

    // Sign all inputs
    inputUtxos.forEach((_, index) => {
      psbt.signInput(index, keyPair);
    });

    // Finalize and broadcast
    psbt.finalizeAllInputs();
    const rawTx = psbt.extractTransaction().toHex();

    // Broadcast transaction
    const broadcastResponse = await axios.post(
      `https://mempool.space${networkPath}/api/tx`,
      rawTx
    );

    if (!broadcastResponse.data) {
      throw new Error('Failed to broadcast Bitcoin transaction');
    }

    return broadcastResponse.data; // Returns the transaction hash
  }

  private async getBitcoinTransactionHex(txid: string, network: string): Promise<string> {
    const networkPath = network === 'testnet' ? '/testnet' : '';
    const response = await axios.get(
      `https://mempool.space${networkPath}/api/tx/${txid}/hex`
    );
    return response.data;
  }

  private async processTronWithdrawal(
    withdrawal: Withdrawal,
    privateKey: string,
    adminAddress: string
  ): Promise<string> {
    this.logger.debug(`Processing Tron withdrawal for ${withdrawal.id}`);

    // Get receiveAmount from metadata
    const receiveAmount = withdrawal.metadata?.receiveAmount;
    if (!receiveAmount) {
      throw new BadRequestException('Receive amount not found in withdrawal metadata');
    }
    this.logger.debug(`Using receive amount: ${receiveAmount} (original amount: ${withdrawal.amount})`);

    // Initialize TronWeb with network-specific configuration
    const fullNode = withdrawal.network === 'mainnet' 
      ? process.env.TRON_MAINNET_API
      : process.env.TRON_TESTNET_API;

    this.logger.debug(`Using TRON ${withdrawal.network} node: ${fullNode}`);
    
    if (!fullNode) {
      throw new BadRequestException(`No TRON RPC URL configured for ${withdrawal.network}`);
    }

    const tronApiKey = process.env.TRON_API_KEY;
    if (!tronApiKey) {
      throw new BadRequestException('TRON API key not configured');
    }

    try {
      const tronWeb = new TronWeb({
        fullHost: fullNode,
        headers: { 
          "TRON-PRO-API-KEY": tronApiKey
        }
      });

      // Set the private key for signing transactions
      tronWeb.setPrivateKey(privateKey);

      // Check admin wallet balance
      const balance = await tronWeb.trx.getBalance(adminAddress);
      this.logger.debug(`Admin wallet balance: ${balance} SUN`);
      
      const amountInSun = tronWeb.toSun(receiveAmount); // Convert TRX to SUN using receiveAmount
      this.logger.debug(`Amount to send in SUN: ${amountInSun}`);

      if (!withdrawal.token.contractAddress) {
        // Native TRX transfer
        if (balance < amountInSun) {
          throw new BadRequestException(`Insufficient TRX balance in admin wallet. Required: ${amountInSun}, Available: ${balance}`);
        }

        this.logger.debug(`Creating native TRX transaction to ${withdrawal.address}`);
        // Create and send transaction
        const transaction = await tronWeb.transactionBuilder.sendTrx(
          withdrawal.address,
          amountInSun,
          adminAddress
        );

        this.logger.debug('Signing transaction...');
        const signedTx = await tronWeb.trx.sign(transaction);
        
        this.logger.debug('Broadcasting transaction...');
        const result = await tronWeb.trx.sendRawTransaction(signedTx);

        if (!result.result) {
          throw new Error(`Failed to broadcast transaction: ${JSON.stringify(result)}`);
        }

        this.logger.debug(`Transaction broadcast successful, txID: ${result.txid}`);

        // Wait for transaction confirmation
        const confirmed = await this.waitForTronTransaction(result.txid, tronWeb);
        if (!confirmed) {
          throw new Error('Transaction failed to confirm');
        }

        return result.txid;
      } else {
        // Token transfer (TRC20)
        // Check if we have enough TRX for fees
        const minTrxForFees = tronWeb.toSun('40'); // Minimum 40 TRX for fees
        if (balance < minTrxForFees) {
          throw new BadRequestException(`Insufficient TRX balance for fees. Required: ${minTrxForFees}, Available: ${balance}`);
        }

        this.logger.debug(`Getting TRC20 contract at ${withdrawal.token.contractAddress}`);
        // Validate contract address format
        if (!tronWeb.isAddress(withdrawal.token.contractAddress)) {
          throw new Error(`Invalid TRC20 contract address format: ${withdrawal.token.contractAddress}`);
        }

        // Get contract instance
        let contract;
        try {
          this.logger.debug('Attempting to get contract instance...');
          
          // Try to validate if the address is a contract
          const addressType = await tronWeb.trx.getUnconfirmedAccount(withdrawal.token.contractAddress);
          this.logger.debug('Address type:', addressType);
          if (!addressType || !addressType.type || addressType.type !== 'Contract') {
            throw new Error(`Address ${withdrawal.token.contractAddress} is not a contract`);
          }

          contract = await tronWeb.contract().at(withdrawal.token.contractAddress);
          this.logger.debug('Contract response:', contract);
          
          if (!contract) {
            throw new Error('Contract instance is null');
          }

          // Validate if contract has required methods
          if (typeof contract.balanceOf !== 'function' || typeof contract.transfer !== 'function') {
            throw new Error('Contract does not implement required TRC20 methods');
          }

          this.logger.debug('Successfully got contract instance with required methods');
        } catch (error) {
          this.logger.error('Error getting contract:', error);
          this.logger.error('Contract address:', withdrawal.token.contractAddress);
          this.logger.error('Network:', withdrawal.network);
          throw new Error(`Failed to get TRC20 contract: ${error.message || 'Contract initialization failed'}`);
        }
        
        // Check token balance
        let tokenBalance;
        try {
          tokenBalance = await contract.balanceOf(adminAddress).call();
          this.logger.debug(`Raw token balance: ${tokenBalance}`);
        } catch (error) {
          this.logger.error('Error getting token balance:', error);
          throw new Error(`Failed to get token balance: ${error.message}`);
        }

        let tokenAmount;
        try {
          tokenAmount = tronWeb.toBigNumber(receiveAmount)
            .multipliedBy(Math.pow(10, withdrawal.token.decimals))
            .toFixed(0);
          this.logger.debug(`Calculated token amount: ${tokenAmount} (decimals: ${withdrawal.token.decimals})`);
        } catch (error) {
          this.logger.error('Error calculating token amount:', error);
          throw new Error(`Failed to calculate token amount: ${error.message}`);
        }

        this.logger.debug(`Token balance check - Required: ${tokenAmount}, Available: ${tokenBalance}`);

        if (tokenBalance < tokenAmount) {
          throw new BadRequestException(`Insufficient token balance in admin wallet. Required: ${tokenAmount}, Available: ${tokenBalance}`);
        }

        this.logger.debug(`Sending TRC20 token transaction to ${withdrawal.address}`);
        // Send token
        try {
          const transferParams = {
            feeLimit: 40_000_000, // 40 TRX
            callValue: 0,
            shouldPollResponse: false  // Don't wait for confirmation
          };
          this.logger.debug(`Transfer parameters: ${JSON.stringify(transferParams)}`);
          
          this.logger.debug('Initiating transfer...');
          const txId = await contract.transfer(
            withdrawal.address,
            tokenAmount
          ).send(transferParams);

          this.logger.debug(`Token transfer initiated, txID: ${txId}`);
          return txId;
        } catch (error) {
          this.logger.error('Error in token transfer:', error);
          if (error.transaction) {
            this.logger.error('Transaction details:', error.transaction);
          }
          throw new Error(`Token transfer failed: ${error.message || 'Unknown error in transfer'}`);
        }
      }
    } catch (error) {
      this.logger.error('Tron withdrawal error:', error);
      if (error instanceof Error) {
        throw new BadRequestException(`Failed to process Tron withdrawal: ${error.message}`);
      }
      throw new BadRequestException('Failed to process Tron withdrawal: Unknown error');
    }
  }

  private async waitForTronTransaction(txId: string, tronWeb: any, maxAttempts = 20): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const [tx, txInfo] = await Promise.all([
          tronWeb.trx.getTransaction(txId),
          tronWeb.trx.getTransactionInfo(txId)
        ]);

        if (tx?.ret?.[0]?.contractRet === 'SUCCESS') {
          return true;
        }
      } catch (error) {
        this.logger.warn(`Error checking transaction ${txId}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return false;
  }

  private async processXrpWithdrawal(
    withdrawal: Withdrawal,
    privateKey: string,
    adminAddress: string
  ): Promise<string> {
    this.logger.debug(`Processing XRP withdrawal for ${withdrawal.id}`);
    this.logger.debug(`XRP Decryption - Private key type: ${typeof privateKey}`);
    this.logger.debug(`XRP Decryption - Private key length: ${privateKey.length}`);
    this.logger.debug(`XRP Decryption - Private key first few chars: ${privateKey.substring(0, 5)}...`);

    // Get receiveAmount from metadata
    const receiveAmount = withdrawal.metadata?.receiveAmount;
    if (!receiveAmount) {
      throw new BadRequestException('Receive amount not found in withdrawal metadata');
    }
    this.logger.debug(`Using receive amount: ${receiveAmount} (original amount: ${withdrawal.amount})`);

    // Initialize XRP client with network-specific configuration
    const serverUrl = withdrawal.network === 'mainnet'
      ? this.configService.get('XRP_MAINNET_RPC_URL', 'wss://xrplcluster.com')
      : this.configService.get('XRP_TESTNET_RPC_URL', 'wss://s.altnet.rippletest.net:51233');

    const client = new Client(serverUrl);

    try {
      await client.connect();

      // Create wallet from private key (seed)
      const xrpl = require('xrpl');
      this.logger.debug('XRP Decryption - About to create wallet from seed');
      const wallet = xrpl.Wallet.fromSeed(privateKey);
      this.logger.debug(`XRP Decryption - Created wallet with address: ${wallet.address}`);

      // Check admin wallet balance
      const accountInfo = await client.request({
        command: 'account_info',
        account: adminAddress,
        ledger_index: 'validated'
      }) as XrpAccountInfoResponse;

      if (accountInfo.error) {
        throw new Error(`Failed to get account info: ${accountInfo.error_message}`);
      }

      const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000; // Convert drops to XRP
      const amountInXRP = parseFloat(receiveAmount); // Use receiveAmount

      // Check if we have enough balance (including 20 XRP reserve and 0.00001 XRP fee)
      if (balance < amountInXRP + 20.00001) {
        throw new BadRequestException('Insufficient XRP balance in admin wallet (including reserve)');
      }

      // Prepare transaction
      const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: adminAddress,
        Destination: withdrawal.address,
        Amount: xrpl.xrpToDrops(receiveAmount), // Use receiveAmount
      });

      // Sign transaction
      const signed = wallet.sign(prepared);

      // Submit transaction
      const result = await client.submitAndWait(signed.tx_blob) as XrpTxResponse;

      if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${result.result.meta.TransactionResult}`);
      }

      await client.disconnect();

      return result.result.hash;
    } catch (error) {
      if (client.isConnected()) {
        await client.disconnect();
      }
      this.logger.error('XRP withdrawal error:', error);
      throw new BadRequestException(`Failed to process XRP withdrawal: ${error.message}`);
    }
  }
} 