import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RemoveRedundant2FAColumn1704461500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'is2FAEnabled');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('users', new TableColumn({
            name: 'is2FAEnabled',
            type: 'boolean',
            default: false
        }));
    }
} 