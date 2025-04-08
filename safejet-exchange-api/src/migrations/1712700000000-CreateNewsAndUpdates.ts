import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNewsAndUpdates1712700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'news_and_updates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['announcement', 'marketUpdate', 'alert'],
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['high', 'medium', 'low'],
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'shortDescription',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'content',
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
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'createdBy',
            type: 'uuid',
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true,
          }
        ],
        foreignKeys: [
          {
            columnNames: ['createdBy'],
            referencedTableName: 'admin',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
          },
          {
            columnNames: ['updatedBy'],
            referencedTableName: 'admin',
            referencedColumnNames: ['id'],
            onDelete: 'NO ACTION',
          }
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('news_and_updates');
  }
} 