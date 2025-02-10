import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGasTankWallets1710600000001 implements MigrationInterface {
    name = 'CreateGasTankWallets1710600000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "gas_tank_wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "blockchain" character varying NOT NULL,
                "network" character varying NOT NULL,
                "address" character varying NOT NULL,
                "keyId" uuid NOT NULL,
                "type" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_gas_tank_wallets" PRIMARY KEY ("id"),
                CONSTRAINT "FK_gas_tank_wallets_wallet_keys" FOREIGN KEY ("keyId") 
                    REFERENCES "wallet_keys"("id") ON DELETE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_gas_tank_wallets_blockchain_network" ON "gas_tank_wallets" ("blockchain", "network")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_gas_tank_wallets_blockchain_network"`);
        await queryRunner.query(`DROP TABLE "gas_tank_wallets"`);
    }
} 