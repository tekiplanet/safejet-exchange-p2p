import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWalletMemoAndTag1710475000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wallets" 
            ADD COLUMN "memo" VARCHAR NULL,
            ADD COLUMN "tag" VARCHAR NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wallets" 
            DROP COLUMN "memo",
            DROP COLUMN "tag"
        `);
    }
} 