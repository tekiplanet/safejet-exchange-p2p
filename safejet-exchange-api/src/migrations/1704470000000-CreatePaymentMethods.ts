import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePaymentMethods1704470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          {
            name: 'Id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'UserId',
            type: 'uuid',
          },
          {
            name: 'Name',
            type: 'varchar',
          },
          {
            name: 'Icon',
            type: 'varchar',
          },
          {
            name: 'IsDefault',
            type: 'boolean',
            default: false,
          },
          {
            name: 'IsVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'Details',
            type: 'jsonb',
          },
          {
            name: 'CreatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'UpdatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['UserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('PaymentMethods');
  }
} 