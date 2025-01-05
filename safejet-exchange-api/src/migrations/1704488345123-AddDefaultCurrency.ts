import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultCurrency1704488345123 implements MigrationInterface {
    name = 'AddDefaultCurrency1704488345123'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "currency" character varying NOT NULL DEFAULT 'USD'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "currency"`);
    }
} 