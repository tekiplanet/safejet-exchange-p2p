import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1704460000000 implements MigrationInterface {
    name = 'CreateInitialTables1704460000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "emailVerified" boolean NOT NULL DEFAULT false,
                "phoneVerified" boolean NOT NULL DEFAULT false,
                "verificationLevel" integer NOT NULL DEFAULT '0',
                "verificationCode" character varying,
                "verificationCodeExpires" TIMESTAMP,
                "passwordResetCode" character varying,
                "passwordResetExpires" TIMESTAMP,
                "twoFactorSecret" character varying,
                "twoFactorEnabled" boolean NOT NULL DEFAULT false,
                "twoFactorBackupCodes" character varying,
                "fullName" character varying NOT NULL,
                "countryCode" character varying NOT NULL,
                "countryName" character varying NOT NULL,
                "phoneWithoutCode" character varying NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'USD',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "kycLevel" integer NOT NULL DEFAULT '0',
                "kycLevelId" uuid,
                "kycData" jsonb,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }
} 