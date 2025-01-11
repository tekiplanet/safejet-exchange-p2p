// import { MigrationInterface, QueryRunner } from "typeorm";

// export class AddCountryInfo1704488245123 implements MigrationInterface {
//     name = 'AddCountryInfo1704488245123'

//     public async up(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`ALTER TABLE "users" ADD "countryCode" character varying`);
//         await queryRunner.query(`ALTER TABLE "users" ADD "countryName" character varying`);
//         await queryRunner.query(`ALTER TABLE "users" ADD "phoneWithoutCode" character varying`);
//     }

//     public async down(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneWithoutCode"`);
//         await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "countryName"`);
//         await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "countryCode"`);
//     }
// }
