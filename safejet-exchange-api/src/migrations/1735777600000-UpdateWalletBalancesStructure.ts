import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWalletBalancesStructure1735777600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add new columns
        await queryRunner.query(`
            ALTER TABLE wallet_balances 
            ADD COLUMN "userId" uuid,
            ADD COLUMN "baseSymbol" character varying;
        `);

        // 2. Update the metadata column structure and migrate data
        await queryRunner.query(`
            -- First, copy userId from wallets table
            UPDATE wallet_balances wb
            SET "userId" = w."userId"
            FROM wallets w
            WHERE wb."walletId" = w.id;

            -- Then, get baseSymbol from tokens table
            UPDATE wallet_balances wb
            SET "baseSymbol" = COALESCE(t."baseSymbol", t.symbol)
            FROM tokens t
            WHERE wb."tokenId" = t.id;

            -- Update metadata structure
            UPDATE wallet_balances wb
            SET metadata = jsonb_build_object(
                'networks', jsonb_build_object(
                    w.blockchain, jsonb_build_object(
                        'walletId', wb."walletId",
                        'tokenId', wb."tokenId",
                        'networkVersion', t."networkVersion",
                        'contractAddress', t."contractAddress"
                    )
                )
            )
            FROM wallets w, tokens t
            WHERE wb."walletId" = w.id
            AND wb."tokenId" = t.id;
        `);

        // 3. Make new columns required
        await queryRunner.query(`
            ALTER TABLE wallet_balances
            ALTER COLUMN "userId" SET NOT NULL,
            ALTER COLUMN "baseSymbol" SET NOT NULL;
        `);

        // 4. Drop old columns and constraints
        await queryRunner.query(`
            ALTER TABLE wallet_balances
            DROP CONSTRAINT IF EXISTS "FK_wallet_balances_tokenId",
            DROP COLUMN "walletId",
            DROP COLUMN "tokenId";
        `);

        // 5. Add new indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_wallet_balances_userId" ON wallet_balances ("userId");
            CREATE INDEX "IDX_wallet_balances_baseSymbol" ON wallet_balances ("baseSymbol");
            CREATE UNIQUE INDEX "UQ_wallet_balances_userId_baseSymbol_type" 
            ON wallet_balances ("userId", "baseSymbol", type);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert all changes in reverse order
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_wallet_balances_userId";
            DROP INDEX IF EXISTS "IDX_wallet_balances_baseSymbol";
            DROP INDEX IF EXISTS "UQ_wallet_balances_userId_baseSymbol_type";

            ALTER TABLE wallet_balances
            ADD COLUMN "walletId" uuid,
            ADD COLUMN "tokenId" uuid;

            -- Restore data from metadata
            UPDATE wallet_balances wb
            SET 
                "walletId" = (metadata->'networks'->>(SELECT blockchain FROM wallets LIMIT 1))->>'walletId',
                "tokenId" = (metadata->'networks'->>(SELECT blockchain FROM wallets LIMIT 1))->>'tokenId';

            ALTER TABLE wallet_balances
            ALTER COLUMN "walletId" SET NOT NULL,
            ALTER COLUMN "tokenId" SET NOT NULL;

            ALTER TABLE wallet_balances
            DROP COLUMN "userId",
            DROP COLUMN "baseSymbol";

            ALTER TABLE wallet_balances
            ADD CONSTRAINT "FK_wallet_balances_tokenId" 
            FOREIGN KEY ("tokenId") REFERENCES tokens(id);
        `);
    }
} 