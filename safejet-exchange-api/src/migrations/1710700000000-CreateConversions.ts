import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversions1710700000000 implements MigrationInterface {
  name = 'CreateConversions1710700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fromTokenId" uuid NOT NULL,
        "toTokenId" uuid NOT NULL,
        "fromAmount" numeric(40,18) NOT NULL,
        "toAmount" numeric(40,18) NOT NULL,
        "exchangeRate" numeric(40,18) NOT NULL,
        "feeAmount" numeric(40,18) NOT NULL,
        "feeType" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'completed',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversions_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_conversions_from_token" FOREIGN KEY ("fromTokenId") 
          REFERENCES "tokens"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_conversions_to_token" FOREIGN KEY ("toTokenId") 
          REFERENCES "tokens"("id") ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversions_user" ON "conversions" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversions_tokens" ON "conversions" ("fromTokenId", "toTokenId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_conversions_tokens"`);
    await queryRunner.query(`DROP INDEX "IDX_conversions_user"`);
    await queryRunner.query(`DROP TABLE "conversions"`);
  }
} 