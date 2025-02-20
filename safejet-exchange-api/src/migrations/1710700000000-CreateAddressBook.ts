import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddressBook1710700000000 implements MigrationInterface {
  name = 'CreateAddressBook1710700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "address_book" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" varchar NOT NULL,
        "address" varchar NOT NULL,
        "blockchain" varchar NOT NULL,
        "network" varchar NOT NULL,
        "memo" varchar NULL,
        "tag" varchar NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_address_book" PRIMARY KEY ("id"),
        CONSTRAINT "FK_address_book_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_address_book_user" ON "address_book" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_address_book_user"`);
    await queryRunner.query(`DROP TABLE "address_book"`);
  }
} 