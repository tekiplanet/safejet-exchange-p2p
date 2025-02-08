import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminWallets1710600000000 implements MigrationInterface {
    name = 'CreateAdminWallets1710600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "admin_wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "blockchain" character varying NOT NULL,
                "network" character varying NOT NULL,
                "address" character varying NOT NULL,
                "keyId" uuid NOT NULL,
                "type" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_admin_wallets" PRIMARY KEY ("id"),
                CONSTRAINT "FK_admin_wallets_wallet_keys" FOREIGN KEY ("keyId") 
                    REFERENCES "wallet_keys"("id") ON DELETE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_admin_wallets_blockchain_network" ON "admin_wallets" ("blockchain", "network")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_admin_wallets_blockchain_network"`);
        await queryRunner.query(`DROP TABLE "admin_wallets"`);
    }
} 