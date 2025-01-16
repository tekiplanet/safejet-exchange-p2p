import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateExchangeRatesTable1705420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'exchange_rates',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'currency',
            type: 'varchar',
          },
          {
            name: 'rate',
            type: 'decimal',
            precision: 18,
            scale: 8,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'lastUpdated',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add index on currency for faster lookups
    await queryRunner.createIndex(
      'exchange_rates',
      new TableIndex({
        name: 'IDX_EXCHANGE_RATES_CURRENCY',
        columnNames: ['currency'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('exchange_rates', 'IDX_EXCHANGE_RATES_CURRENCY');
    await queryRunner.dropTable('exchange_rates');
  }
}