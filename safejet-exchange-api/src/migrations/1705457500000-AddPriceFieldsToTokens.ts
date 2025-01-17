import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPriceFieldsToTokens1705457500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('tokens', [
      new TableColumn({
        name: 'currentPrice',
        type: 'decimal',
        precision: 24,
        scale: 8,
        default: 0,
      }),
      new TableColumn({
        name: 'price24h',
        type: 'decimal',
        precision: 24,
        scale: 8,
        default: 0,
      }),
      new TableColumn({
        name: 'changePercent24h',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
      }),
      new TableColumn({
        name: 'lastPriceUpdate',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('tokens', [
      'currentPrice',
      'price24h',
      'changePercent24h',
      'lastPriceUpdate',
    ]);
  }
} 