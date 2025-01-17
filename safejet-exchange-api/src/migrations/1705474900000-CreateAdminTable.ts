import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

export class CreateAdminTable1705474900000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "admins" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "email" varchar NOT NULL UNIQUE,
                "password" varchar NOT NULL,
                "isActive" boolean DEFAULT true,
                "permissions" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create default admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await queryRunner.query(`
            INSERT INTO "admins" (email, password, permissions)
            VALUES ('admin@safejet.com', $1, '["all"]')
        `, [hashedPassword]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admins"`);
    }
} 