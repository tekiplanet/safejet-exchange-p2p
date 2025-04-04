import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateP2PDisputeTables1694123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create p2p_disputes table
    await queryRunner.query(`
      CREATE TABLE "p2p_disputes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "initiatorId" uuid NOT NULL,
        "respondentId" uuid,
        "reason" text NOT NULL,
        "reasonType" varchar NOT NULL DEFAULT 'other',
        "status" varchar NOT NULL DEFAULT 'pending',
        "evidence" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        "adminId" uuid,
        "adminNotes" text,
        CONSTRAINT "PK_p2p_disputes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_p2p_disputes_order" FOREIGN KEY ("orderId") REFERENCES "p2p_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_p2p_disputes_initiator" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_p2p_disputes_respondent" FOREIGN KEY ("respondentId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_p2p_disputes_admin" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create p2p_dispute_messages table
    await queryRunner.query(`
      CREATE TABLE "p2p_dispute_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "disputeId" uuid NOT NULL,
        "senderId" uuid,
        "senderType" varchar NOT NULL DEFAULT 'user',
        "message" text NOT NULL,
        "attachmentUrl" varchar,
        "attachmentType" varchar,
        "isDelivered" boolean NOT NULL DEFAULT false,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_p2p_dispute_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_p2p_dispute_messages_dispute" FOREIGN KEY ("disputeId") REFERENCES "p2p_disputes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_p2p_dispute_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_p2p_disputes_order" ON "p2p_disputes" ("orderId");
      CREATE INDEX "IDX_p2p_disputes_initiator" ON "p2p_disputes" ("initiatorId");
      CREATE INDEX "IDX_p2p_disputes_respondent" ON "p2p_disputes" ("respondentId");
      CREATE INDEX "IDX_p2p_disputes_admin" ON "p2p_disputes" ("adminId");
      CREATE INDEX "IDX_p2p_disputes_status" ON "p2p_disputes" ("status");
      
      CREATE INDEX "IDX_p2p_dispute_messages_dispute" ON "p2p_dispute_messages" ("disputeId");
      CREATE INDEX "IDX_p2p_dispute_messages_sender" ON "p2p_dispute_messages" ("senderId");
      CREATE INDEX "IDX_p2p_dispute_messages_created" ON "p2p_dispute_messages" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_p2p_dispute_messages_created";
      DROP INDEX IF EXISTS "IDX_p2p_dispute_messages_sender";
      DROP INDEX IF EXISTS "IDX_p2p_dispute_messages_dispute";
      
      DROP INDEX IF EXISTS "IDX_p2p_disputes_status";
      DROP INDEX IF EXISTS "IDX_p2p_disputes_admin";
      DROP INDEX IF EXISTS "IDX_p2p_disputes_respondent";
      DROP INDEX IF EXISTS "IDX_p2p_disputes_initiator";
      DROP INDEX IF EXISTS "IDX_p2p_disputes_order";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "p2p_dispute_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "p2p_disputes"`);
  }
} 