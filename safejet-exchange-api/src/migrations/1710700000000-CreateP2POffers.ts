import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateP2POffers1710700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'p2p_offers',
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
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'tokenId',
            type: 'uuid',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 40,
            scale: 18,
          },
          {
            name: 'currency',
            type: 'varchar',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 40,
            scale: 18,
          },
          {
            name: 'priceUSD',
            type: 'decimal',
            precision: 40,
            scale: 18,
          },
          {
            name: 'paymentMethods',
            type: 'jsonb',
          },
          {
            name: 'terms',
            type: 'text',
          },
          {
            name: 'status',
            type: 'varchar',
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

    // Add foreign keys
    await queryRunner.createForeignKey(
      'p2p_offers',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'p2p_offers',
      new TableForeignKey({
        columnNames: ['tokenId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tokens',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('p2p_offers');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('p2p_offers', foreignKey);
      }
    }
    await queryRunner.dropTable('p2p_offers');
  }
} 