import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderDeadlines1710800000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add payment deadline column
    await queryRunner.addColumn(
      'p2p_orders',
      new TableColumn({
        name: 'paymentDeadline',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add confirmation deadline column
    await queryRunner.addColumn(
      'p2p_orders',
      new TableColumn({
        name: 'confirmationDeadline',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('p2p_orders', 'confirmationDeadline');
    await queryRunner.dropColumn('p2p_orders', 'paymentDeadline');
  }
} 