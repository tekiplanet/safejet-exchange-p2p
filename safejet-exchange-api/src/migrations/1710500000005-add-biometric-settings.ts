import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBiometricSettings1710500000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "biometricEnabled" BOOLEAN DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS "biometricEnabled"
    `);
  }
} 