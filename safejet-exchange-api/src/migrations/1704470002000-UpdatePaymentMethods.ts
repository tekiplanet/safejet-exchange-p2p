import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class UpdatePaymentMethods1704470002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key for payment_method_type
    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['paymentMethodTypeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payment_method_types',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Try to get and drop the foreign key if it exists
      const table = await queryRunner.getTable('payment_methods');
      if (table) {
        const foreignKey = table.foreignKeys.find(
          (fk) => fk.columnNames.indexOf('paymentMethodTypeId') !== -1,
        );
        if (foreignKey) {
          await queryRunner.dropForeignKey('payment_methods', foreignKey);
        }
      }
    } catch (error) {
      console.log('Foreign key not found, continuing...');
    }
  }
}
