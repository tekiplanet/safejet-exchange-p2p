import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNetworkConfigsToToken1705627200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add networkConfigs column
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            ADD COLUMN IF NOT EXISTS "networkConfigs" JSONB;
        `);

        // Migrate existing data
        await queryRunner.query(`
            UPDATE "tokens" 
            SET "networkConfigs" = jsonb_build_array(
                jsonb_build_object(
                    'blockchain', blockchain,
                    'version', "networkVersion",
                    'arrivalTime', 
                    CASE 
                        WHEN blockchain = 'ethereum' THEN '10-30 minutes'
                        WHEN blockchain = 'trx' THEN '5-10 minutes'
                        WHEN blockchain = 'bsc' THEN '5-10 minutes'
                        ELSE '10-30 minutes'
                    END,
                    'isActive', "isActive",
                    'requiredFields', jsonb_build_object(
                        'memo', false,
                        'tag', false
                    )
                )
            )
            WHERE "networkConfigs" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "tokens" 
            DROP COLUMN IF EXISTS "networkConfigs";
        `);
    }
} 