import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToP2POffers1710700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "p2p_offers"
      ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "p2p_offers"
      DROP COLUMN IF EXISTS "metadata"
    `);
  }
} 