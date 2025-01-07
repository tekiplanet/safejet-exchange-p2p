import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnfidoApplicantId1710100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "onfidoApplicantId" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "onfidoApplicantId"
    `);
  }
} 