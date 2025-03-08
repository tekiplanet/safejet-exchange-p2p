import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFrozenToWalletBalances1710800000000 implements MigrationInterface {
  name = 'AddFrozenToWalletBalances1710800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_balances" ADD COLUMN "frozen" decimal(36,18) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_balances" DROP COLUMN "frozen"`);
  }
} 