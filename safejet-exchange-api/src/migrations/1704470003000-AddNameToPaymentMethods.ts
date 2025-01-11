import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNameToPaymentMethods1704470003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'payment_methods',
      new TableColumn({
        name: 'name',
        type: 'varchar',
        length: '100',
        isNullable: false,
        default: "'Unnamed Payment Method'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('payment_methods', 'name');
  }
} 