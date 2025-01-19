import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDepositsTable1735777601000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'deposits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'walletId',
            type: 'uuid',
          },
          {
            name: 'tokenId',
            type: 'uuid',
          },
          {
            name: 'txHash',
            type: 'varchar',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 36,
            scale: 18,
          },
          {
            name: 'blockchain',
            type: 'varchar',
          },
          {
            name: 'network',
            type: 'varchar',
          },
          {
            name: 'networkVersion',
            type: 'varchar',
          },
          {
            name: 'blockNumber',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'confirmations',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirming', 'confirmed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'deposits',
      new TableIndex({
        name: 'IDX_deposits_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'deposits',
      new TableIndex({
        name: 'IDX_deposits_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'deposits',
      new TableIndex({
        name: 'IDX_deposits_txHash',
        columnNames: ['txHash'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deposits');
  }
} 