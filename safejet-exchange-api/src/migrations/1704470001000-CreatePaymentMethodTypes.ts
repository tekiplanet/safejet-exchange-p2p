import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePaymentMethodTypes1704470001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_method_types table
    await queryRunner.createTable(
      new Table({
        name: 'payment_method_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'icon',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
      true,
    );

    // Create payment_method_fields table
    await queryRunner.createTable(
      new Table({
        name: 'payment_method_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'paymentMethodTypeId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'label',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'varchar',
          },
          {
            name: 'placeholder',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'helpText',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'validationRules',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isRequired',
            type: 'boolean',
            default: true,
          },
          {
            name: 'order',
            type: 'integer',
            default: 0,
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
      true,
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'payment_method_fields',
      new TableForeignKey({
        columnNames: ['paymentMethodTypeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payment_method_types',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // First drop all foreign keys that reference payment_method_types
    const tables = ['payment_methods', 'payment_method_fields'];
    for (const tableName of tables) {
      const table = await queryRunner.getTable(tableName);
      if (table) {
        const foreignKeys = table.foreignKeys.filter(
          fk => fk.referencedTableName === 'payment_method_types'
        );
        for (const foreignKey of foreignKeys) {
          await queryRunner.dropForeignKey(tableName, foreignKey);
        }
      }
    }

    // Now drop the tables in correct order
    await queryRunner.dropTable('payment_method_fields', true);
    await queryRunner.dropTable('payment_method_types', true);
  }
} 