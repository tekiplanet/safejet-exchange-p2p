import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTokenPriceColumns1705475000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First drop the existing columns
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            DROP COLUMN IF EXISTS "currentPrice",
            DROP COLUMN IF EXISTS "price24h",
            DROP COLUMN IF EXISTS "changePercent24h"
        `);

        // Add them back with proper numeric types
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            ADD COLUMN "currentPrice" numeric(40,18) DEFAULT 0,
            ADD COLUMN "price24h" numeric(40,18) DEFAULT 0,
            ADD COLUMN "changePercent24h" numeric(40,18) DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to original columns
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            DROP COLUMN IF EXISTS "currentPrice",
            DROP COLUMN IF EXISTS "price24h",
            DROP COLUMN IF EXISTS "changePercent24h"
        `);

        await queryRunner.query(`
            ALTER TABLE "tokens" 
            ADD COLUMN "currentPrice" numeric DEFAULT 0,
            ADD COLUMN "price24h" numeric DEFAULT 0,
            ADD COLUMN "changePercent24h" numeric DEFAULT 0
        `);
    }
} 