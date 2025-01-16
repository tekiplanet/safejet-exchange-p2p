import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenAndBalanceTables1735000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tokens table
    await queryRunner.query(`
      CREATE TABLE "tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "symbol" varchar NOT NULL,
        "name" varchar NOT NULL,
        "blockchain" varchar NOT NULL,
        "contractAddress" varchar,
        "decimals" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb
      )
    `);

    // Create wallet_balances table
    await queryRunner.query(`
      CREATE TABLE "wallet_balances" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "walletId" uuid NOT NULL,
        "tokenId" uuid NOT NULL,
        "balance" decimal(36,18) NOT NULL DEFAULT 0,
        "type" varchar NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wallet_balances_wallet" 
          FOREIGN KEY ("walletId") 
          REFERENCES "wallets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_wallet_balances_token" 
          FOREIGN KEY ("tokenId") 
          REFERENCES "tokens"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_balances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tokens"`);
  }
} 