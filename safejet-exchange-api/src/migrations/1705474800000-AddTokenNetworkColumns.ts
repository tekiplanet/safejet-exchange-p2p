import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokenNetworkColumns1705474800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            ADD COLUMN IF NOT EXISTS "baseSymbol" varchar,
            ADD COLUMN IF NOT EXISTS "networkVersion" varchar
        `);

        // Update existing tokens with baseSymbol and networkVersion
        // USDT tokens
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "baseSymbol" = 'USDT',
                "networkVersion" = 
                    CASE 
                        WHEN "blockchain" = 'ethereum' THEN 'ERC20'
                        WHEN "blockchain" = 'trx' THEN 'TRC20'
                        WHEN "blockchain" = 'bsc' THEN 'BEP20'
                    END
            WHERE "symbol" = 'USDT'
        `);

        // USDC tokens
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "baseSymbol" = 'USDC',
                "networkVersion" = 
                    CASE 
                        WHEN "blockchain" = 'ethereum' THEN 'ERC20'
                        WHEN "blockchain" = 'trx' THEN 'TRC20'
                    END
            WHERE "symbol" = 'USDC'
        `);

        // WBTC tokens
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "baseSymbol" = 'WBTC',
                "networkVersion" = 
                    CASE 
                        WHEN "blockchain" = 'ethereum' THEN 'ERC20'
                        WHEN "blockchain" = 'bsc' THEN 'BEP20'
                    END
            WHERE "symbol" = 'WBTC'
        `);

        // DAI tokens
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "baseSymbol" = 'DAI',
                "networkVersion" = 
                    CASE 
                        WHEN "blockchain" = 'ethereum' THEN 'ERC20'
                        WHEN "blockchain" = 'bsc' THEN 'BEP20'
                    END
            WHERE "symbol" = 'DAI'
        `);

        // For all other tokens, set baseSymbol same as symbol and networkVersion as 'NATIVE'
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "baseSymbol" = "symbol",
                "networkVersion" = 'NATIVE'
            WHERE "baseSymbol" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            DROP COLUMN IF EXISTS "baseSymbol",
            DROP COLUMN IF EXISTS "networkVersion"
        `);
    }
} 