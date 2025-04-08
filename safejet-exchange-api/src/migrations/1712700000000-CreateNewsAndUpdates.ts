import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewsAndUpdates1712700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum types
        await queryRunner.query(`CREATE TYPE "public"."news_and_updates_type_enum" AS ENUM('announcement', 'marketUpdate', 'alert')`);
        await queryRunner.query(`CREATE TYPE "public"."news_and_updates_priority_enum" AS ENUM('high', 'medium', 'low')`);

        // Create table without foreign key constraints
        await queryRunner.query(`
            CREATE TABLE "news_and_updates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" "public"."news_and_updates_type_enum" NOT NULL,
                "priority" "public"."news_and_updates_priority_enum" NOT NULL,
                "title" varchar NOT NULL,
                "shortDescription" varchar(255) NOT NULL,
                "content" text NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamp NOT NULL DEFAULT NOW(),
                "updatedAt" timestamp NOT NULL DEFAULT NOW(),
                "createdBy" uuid,
                "updatedBy" uuid,
                CONSTRAINT "PK_48e1380f74fa915148d4345f86c" PRIMARY KEY ("id")
            )
        `);

        // Check if admin table exists
        const adminTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'admin'
            )
        `);

        // Add foreign key constraints if admin table exists
        if (adminTableExists[0].exists) {
            await queryRunner.query(`
                ALTER TABLE "news_and_updates" 
                ADD CONSTRAINT "FK_e6c76b09fe16b36e7c4bb53901b" 
                FOREIGN KEY ("createdBy") 
                REFERENCES "admin"("id") 
                ON DELETE SET NULL
            `);

            await queryRunner.query(`
                ALTER TABLE "news_and_updates" 
                ADD CONSTRAINT "FK_cbbc3fa242b3be4a8120942226c" 
                FOREIGN KEY ("updatedBy") 
                REFERENCES "admin"("id") 
                ON DELETE SET NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints if they exist
        await queryRunner.query(`ALTER TABLE "news_and_updates" DROP CONSTRAINT IF EXISTS "FK_e6c76b09fe16b36e7c4bb53901b"`);
        await queryRunner.query(`ALTER TABLE "news_and_updates" DROP CONSTRAINT IF EXISTS "FK_cbbc3fa242b3be4a8120942226c"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "news_and_updates"`);

        // Drop enum types
        await queryRunner.query(`DROP TYPE "public"."news_and_updates_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."news_and_updates_priority_enum"`);
    }
} 