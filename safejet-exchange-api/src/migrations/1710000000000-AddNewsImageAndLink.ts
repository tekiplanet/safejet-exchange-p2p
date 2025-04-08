import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewsImageAndLink1710000000000 implements MigrationInterface {
    name = 'AddNewsImageAndLink1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_and_updates" ADD "imageUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "news_and_updates" ADD "externalLink" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_and_updates" DROP COLUMN "externalLink"`);
        await queryRunner.query(`ALTER TABLE "news_and_updates" DROP COLUMN "imageUrl"`);
    }
} 