import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSystemSettingsTable1735777602000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          {
            name: 'key',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'value',
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
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('system_settings');
  }
} 