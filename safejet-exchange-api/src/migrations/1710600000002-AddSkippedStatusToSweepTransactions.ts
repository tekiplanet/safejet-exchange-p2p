import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkippedStatusToSweepTransactions1710600000002 implements MigrationInterface {
    name = 'AddSkippedStatusToSweepTransactions1710600000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add message column
        await queryRunner.query(`
            ALTER TABLE "sweep_transactions"
            ADD COLUMN "message" TEXT
        `);

        // Update status enum
        await queryRunner.query(`
            ALTER TABLE "sweep_transactions" 
            ALTER COLUMN "status" TYPE VARCHAR(255)
        `);

        await queryRunner.query(`
            DROP TYPE IF EXISTS "public"."sweep_transactions_status_enum";
            CREATE TYPE "public"."sweep_transactions_status_enum" AS ENUM ('pending', 'completed', 'failed', 'skipped')
        `);

        await queryRunner.query(`
            ALTER TABLE "sweep_transactions" 
            ALTER COLUMN "status" TYPE "public"."sweep_transactions_status_enum" 
            USING status::"public"."sweep_transactions_status_enum"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove message column
        await queryRunner.query(`
            ALTER TABLE "sweep_transactions"
            DROP COLUMN "message"
        `);

        // Revert status enum
        await queryRunner.query(`
            ALTER TABLE "sweep_transactions" 
            ALTER COLUMN "status" TYPE VARCHAR(255)
        `);

        await queryRunner.query(`
            DROP TYPE "public"."sweep_transactions_status_enum";
            CREATE TYPE "public"."sweep_transactions_status_enum" AS ENUM ('pending', 'completed', 'failed')
        `);

        await queryRunner.query(`
            ALTER TABLE "sweep_transactions" 
            ALTER COLUMN "status" TYPE "public"."sweep_transactions_status_enum" 
            USING (
                CASE 
                    WHEN status = 'skipped' THEN 'failed'
                    ELSE status
                END
            )::"public"."sweep_transactions_status_enum"
        `);
    }
} 