import { Controller, Get, Post, Query, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SweepTransaction } from '../wallet/entities/sweep-transaction.entity';
import { Deposit } from '../wallet/entities/deposit.entity';
import { DepositTrackingService } from '../wallet/services/deposit-tracking.service';

@Controller('admin/sweep-transactions')
@UseGuards(AdminGuard)
export class AdminSweepTransactionsController {
    constructor(
        @InjectRepository(SweepTransaction)
        private sweepTransactionRepository: Repository<SweepTransaction>,
        @InjectRepository(Deposit)
        private depositRepository: Repository<Deposit>,
        private depositTrackingService: DepositTrackingService
    ) {}

    @Get()
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search = '',
        @Query('status') status = ''
    ) {
        const query = this.sweepTransactionRepository.createQueryBuilder('sweep');

        // Apply search if provided
        if (search) {
            query.where(
                'sweep.txHash ILIKE :search OR CAST(sweep.id AS TEXT) ILIKE :search OR sweep.fromWalletId ILIKE :search',
                { search: `%${search}%` }
            );
        }

        // Apply status filter
        if (status) {
            query.andWhere('sweep.status = :status', { status });
        }

        // Add order by
        query.orderBy('sweep.createdAt', 'DESC');

        // Get total count
        const total = await query.getCount();

        // Apply pagination
        const sweepTxs = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            data: sweepTxs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    @Post(':id/retry')
    async retry(
        @Param('id') id: string,
        @Body() body: { feeOption: 'same' | 'higher' }
    ) {
        const sweepTx = await this.sweepTransactionRepository.findOne({
            where: { id }
        });

        if (!sweepTx) {
            throw new NotFoundException('Sweep transaction not found');
        }

        if (sweepTx.status === 'completed') {
            throw new BadRequestException('Cannot retry completed sweep');
        }

        const deposit = await this.depositRepository.findOne({
            where: { id: sweepTx.depositId }
        });

        if (!deposit) {
            throw new NotFoundException('Associated deposit not found');
        }

        // Update sweep transaction status to pending
        await this.sweepTransactionRepository.update(id, {
            status: 'pending',
            message: `Retrying sweep with ${body.feeOption} fee`
        });

        // Call deposit tracking service to retry sweep
        const result = await this.depositTrackingService.retrySweep(sweepTx, deposit, body.feeOption);

        return result;
    }
} 