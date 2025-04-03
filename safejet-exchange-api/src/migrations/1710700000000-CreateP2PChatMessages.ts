import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateP2PChatMessages1710700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'p2p_chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'orderId',
            type: 'uuid',
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: true, // null for system messages
          },
          {
            name: 'messageType',
            type: 'enum',
            enum: ['BUYER', 'SELLER', 'SYSTEM'],
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'isDelivered',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'p2p_chat_messages',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'p2p_orders',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'p2p_chat_messages',
      new TableForeignKey({
        columnNames: ['senderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_p2p_chat_messages_order" ON "p2p_chat_messages" ("orderId");
      CREATE INDEX "IDX_p2p_chat_messages_sender" ON "p2p_chat_messages" ("senderId");
      CREATE INDEX "IDX_p2p_chat_messages_created" ON "p2p_chat_messages" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('p2p_chat_messages');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('p2p_chat_messages', foreignKey);
      }
    }

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_p2p_chat_messages_order";
      DROP INDEX IF EXISTS "IDX_p2p_chat_messages_sender";
      DROP INDEX IF EXISTS "IDX_p2p_chat_messages_created";
    `);

    await queryRunner.dropTable('p2p_chat_messages');
  }
} 