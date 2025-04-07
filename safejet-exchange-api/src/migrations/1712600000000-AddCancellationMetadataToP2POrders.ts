import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancellationMetadataToP2POrders1712600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cancellationMetadata column to p2p_orders table
    await queryRunner.query(`
      ALTER TABLE "p2p_orders"
      ADD COLUMN "cancellationMetadata" JSONB DEFAULT NULL
    `);

    // Add an index for better performance when querying JSON data
    await queryRunner.query(`
      CREATE INDEX "IDX_p2p_orders_cancellationMetadata" ON "p2p_orders" USING GIN ("cancellationMetadata")
    `);

    // Add comments to explain the structure
    await queryRunner.query(`
      COMMENT ON COLUMN "p2p_orders"."cancellationMetadata" IS 'JSON object with structure: {cancelledBy: "buyer"|"seller", reason: string, additionalDetails: string}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_p2p_orders_cancellationMetadata"
    `);

    // Then drop the column
    await queryRunner.query(`
      ALTER TABLE "p2p_orders"
      DROP COLUMN "cancellationMetadata"
    `);
  }
} 