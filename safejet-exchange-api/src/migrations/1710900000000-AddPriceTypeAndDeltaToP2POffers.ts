import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceTypeAndDeltaToP2POffers1710900000000 implements MigrationInterface {
  name = 'AddPriceTypeAndDeltaToP2POffers1710900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(
      `ALTER TABLE "p2p_offers" 
       ADD COLUMN "priceType" varchar(20) NOT NULL DEFAULT 'fixed',
       ADD COLUMN "priceDelta" decimal(36,18) NOT NULL DEFAULT '0'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "p2p_offers" DROP COLUMN "priceDelta"`);
    await queryRunner.query(`ALTER TABLE "p2p_offers" DROP COLUMN "priceType"`);
  }
} 