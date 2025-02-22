import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransfers1710800000000 implements MigrationInterface {
    name = 'CreateTransfers1710800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "transfers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "tokenId" uuid NOT NULL,
                "amount" decimal(36,18) NOT NULL,
                "fromType" character varying NOT NULL,
                "toType" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'completed',
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_transfers" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "transfers"
            ADD CONSTRAINT "FK_transfers_users"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "transfers"
            ADD CONSTRAINT "FK_transfers_tokens"
            FOREIGN KEY ("tokenId")
            REFERENCES "tokens"("id")
            ON DELETE NO ACTION
        `);

        // Add indices for common queries
        await queryRunner.query(`
            CREATE INDEX "IDX_transfers_userId" ON "transfers" ("userId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_transfers_status" ON "transfers" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_transfers_createdAt" ON "transfers" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_transfers_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_transfers_status"`);
        await queryRunner.query(`DROP INDEX "IDX_transfers_userId"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_transfers_tokens"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP CONSTRAINT "FK_transfers_users"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
    }
} 