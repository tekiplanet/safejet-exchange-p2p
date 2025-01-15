import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLanguageSettings1710500000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en' NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS language
    `);
  }
} 