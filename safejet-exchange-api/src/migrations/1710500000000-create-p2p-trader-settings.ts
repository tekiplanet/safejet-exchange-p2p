import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateP2PTraderSettings1710500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'p2p_trader_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'NGN'",
          },
          {
            name: 'autoAcceptOrders',
            type: 'boolean',
            default: false,
          },
          {
            name: 'onlyVerifiedUsers',
            type: 'boolean',
            default: true,
          },
          {
            name: 'showOnlineStatus',
            type: 'boolean',
            default: true,
          },
          {
            name: 'enableInstantTrade',
            type: 'boolean',
            default: false,
          },
          {
            name: 'timezone',
            type: 'varchar',
            default: "'Africa/Lagos'",
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

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'p2p_trader_settings',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('p2p_trader_settings');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('p2p_trader_settings', foreignKey);
      }
    }
    await queryRunner.dropTable('p2p_trader_settings');
  }
} 