import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgressToP2PDisputes1712512000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add progressHistory column to p2p_disputes table
    await queryRunner.query(`
      ALTER TABLE "p2p_disputes"
      ADD COLUMN "progressHistory" JSONB DEFAULT '[]'::JSONB
    `);

    // Add an index for better performance when querying JSON data
    await queryRunner.query(`
      CREATE INDEX "IDX_p2p_disputes_progressHistory" ON "p2p_disputes" USING GIN ("progressHistory")
    `);

    // Add comments to explain the structure
    await queryRunner.query(`
      COMMENT ON COLUMN "p2p_disputes"."progressHistory" IS 'Array of progress steps with structure: [{title: string, details: string, timestamp: string, addedBy: string}]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_p2p_disputes_progressHistory"
    `);

    // Then drop the column
    await queryRunner.query(`
      ALTER TABLE "p2p_disputes"
      DROP COLUMN "progressHistory"
    `);
  }
} 