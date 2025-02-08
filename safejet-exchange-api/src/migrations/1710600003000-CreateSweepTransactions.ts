import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSweepTransactions1710600003000 implements MigrationInterface {
    name = 'CreateSweepTransactions1710600003000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sweep_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "depositId" uuid NOT NULL,
                "fromWalletId" uuid NOT NULL,
                "toAdminWalletId" uuid NOT NULL,
                "txHash" character varying NOT NULL,
                "amount" character varying NOT NULL,
                "status" character varying NOT NULL,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sweep_transactions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_sweep_transactions_deposits" FOREIGN KEY ("depositId") 
                    REFERENCES "deposits"("id") ON DELETE NO ACTION,
                CONSTRAINT "FK_sweep_transactions_wallets" FOREIGN KEY ("fromWalletId") 
                    REFERENCES "wallets"("id") ON DELETE NO ACTION,
                CONSTRAINT "FK_sweep_transactions_admin_wallets" FOREIGN KEY ("toAdminWalletId") 
                    REFERENCES "admin_wallets"("id") ON DELETE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_sweep_transactions_deposit" ON "sweep_transactions" ("depositId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_sweep_transactions_status" ON "sweep_transactions" ("status")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_sweep_transactions_status"`);
        await queryRunner.query(`DROP INDEX "IDX_sweep_transactions_deposit"`);
        await queryRunner.query(`DROP TABLE "sweep_transactions"`);
    }
} 