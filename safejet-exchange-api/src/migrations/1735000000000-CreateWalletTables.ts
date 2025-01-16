import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletTables1735000000000 implements MigrationInterface {
  name = 'CreateWalletTables1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallet_keys table
    await queryRunner.query(`
      CREATE TABLE "wallet_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "encryptedPrivateKey" text NOT NULL,
        "encryptionVersion" integer NOT NULL,
        "keyType" varchar NOT NULL DEFAULT 'hot',
        "backupData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wallet_keys_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create wallets table
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "blockchain" varchar NOT NULL,
        "network" varchar NOT NULL DEFAULT 'mainnet',
        "address" varchar NOT NULL,
        "keyId" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wallets_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_wallets_key" FOREIGN KEY ("keyId") 
          REFERENCES "wallet_keys"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "idx_wallets_user_blockchain" ON "wallets"("userId", "blockchain");
      CREATE INDEX "idx_wallet_keys_user" ON "wallet_keys"("userId");
      CREATE UNIQUE INDEX "idx_wallets_user_blockchain_network_active" 
        ON "wallets"("userId", "blockchain", "network") 
        WHERE status = 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallets_user_blockchain_network_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallets_user_blockchain"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wallet_keys_user"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_keys"`);
  }
} 