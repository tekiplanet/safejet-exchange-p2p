import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWithdrawals1710700000000 implements MigrationInterface {
    name = 'CreateWithdrawals1710700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "withdrawals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "tokenId" uuid NOT NULL,
                "address" character varying NOT NULL,
                "amount" decimal(36,18) NOT NULL,
                "fee" decimal(36,18) NOT NULL,
                "networkVersion" character varying NOT NULL,
                "network" character varying NOT NULL,
                "memo" character varying,
                "tag" character varying,
                "status" character varying NOT NULL DEFAULT 'pending',
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_withdrawals" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "withdrawals"
            ADD CONSTRAINT "FK_withdrawals_users"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "withdrawals"
            ADD CONSTRAINT "FK_withdrawals_tokens"
            FOREIGN KEY ("tokenId")
            REFERENCES "tokens"("id")
            ON DELETE NO ACTION
        `);

        // Add indices for common queries
        await queryRunner.query(`
            CREATE INDEX "IDX_withdrawals_userId" ON "withdrawals" ("userId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_withdrawals_status" ON "withdrawals" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_withdrawals_createdAt" ON "withdrawals" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_withdrawals_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_withdrawals_status"`);
        await queryRunner.query(`DROP INDEX "IDX_withdrawals_userId"`);
        await queryRunner.query(`ALTER TABLE "withdrawals" DROP CONSTRAINT "FK_withdrawals_tokens"`);
        await queryRunner.query(`ALTER TABLE "withdrawals" DROP CONSTRAINT "FK_withdrawals_users"`);
        await queryRunner.query(`DROP TABLE "withdrawals"`);
    }
} 