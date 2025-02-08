import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTypeToWalletKeys1710600001000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wallet_keys"
            ADD COLUMN "userType" varchar NOT NULL DEFAULT 'user'
        `);

        // Create index for faster lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_WALLET_KEYS_USER_TYPE" ON "wallet_keys" ("userType")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "IDX_WALLET_KEYS_USER_TYPE"
        `);

        await queryRunner.query(`
            ALTER TABLE "wallet_keys"
            DROP COLUMN "userType"
        `);
    }
} 