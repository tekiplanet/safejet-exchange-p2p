import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttachmentsToChatMessages1710000000000 implements MigrationInterface {
    name = 'AddAttachmentsToChatMessages1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "p2p_chat_messages" ADD "attachmentUrl" character varying`
        );
        await queryRunner.query(
            `ALTER TABLE "p2p_chat_messages" ADD "attachmentType" character varying`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "p2p_chat_messages" DROP COLUMN "attachmentType"`
        );
        await queryRunner.query(
            `ALTER TABLE "p2p_chat_messages" DROP COLUMN "attachmentUrl"`
        );
    }
} 