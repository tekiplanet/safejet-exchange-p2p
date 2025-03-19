import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateP2POrders1710700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'p2p_orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'offerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'buyerId',
            type: 'uuid',
          },
          {
            name: 'sellerId',
            type: 'uuid',
          },
          {
            name: 'paymentMetadata',
            type: 'jsonb',
          },
          {
            name: 'assetAmount',
            type: 'numeric',
            precision: 24,
            scale: 8,
          },
          {
            name: 'currencyAmount',
            type: 'numeric',
            precision: 24,
            scale: 8,
          },
          {
            name: 'buyerStatus',
            type: 'enum',
            enum: ['pending', 'paid', 'disputed', 'completed', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'sellerStatus',
            type: 'enum',
            enum: ['pending', 'confirmed', 'disputed', 'completed', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'trackingId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'confirmedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
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

    await queryRunner.createForeignKey(
      'p2p_orders',
      new TableForeignKey({
        columnNames: ['offerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'p2p_offers',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'p2p_orders',
      new TableForeignKey({
        columnNames: ['buyerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'p2p_orders',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('p2p_orders');
    if (table) {
      const foreignKeys = table.foreignKeys.filter(
        (fk) => fk.referencedTableName === 'p2p_offers' || fk.referencedTableName === 'users',
      );
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('p2p_orders', foreignKey);
      }
    }
    await queryRunner.dropTable('p2p_orders');
  }
} 