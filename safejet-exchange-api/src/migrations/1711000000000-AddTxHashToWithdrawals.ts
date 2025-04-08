import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTxHashToWithdrawals1711000000000 implements MigrationInterface {
    name = 'AddTxHashToWithdrawals1711000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdrawals" ADD "txHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdrawals" DROP COLUMN "txHash"`);
    }
} 