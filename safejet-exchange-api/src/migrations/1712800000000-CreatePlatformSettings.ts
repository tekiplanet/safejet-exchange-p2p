import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePlatformSettings1712800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'platform_settings',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'key',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'value',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'general'",
                    },
                    {
                        name: 'isSensitive',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'lastUpdatedBy',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
                indices: [
                    {
                        name: 'IDX_PLATFORM_SETTINGS_KEY',
                        columnNames: ['key'],
                    },
                    {
                        name: 'IDX_PLATFORM_SETTINGS_CATEGORY',
                        columnNames: ['category'],
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['lastUpdatedBy'],
                        referencedTableName: 'admins',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    },
                ],
            }),
            true,
        );

        // Insert some default settings
        await queryRunner.query(`
            INSERT INTO "platform_settings" (key, value, description, category, "isSensitive")
            VALUES 
                ('contactEmail', '"support@safejet.com"', 'Primary contact email for the platform', 'contact', false),
                ('supportPhone', '"1234567890"', 'Support phone number', 'contact', false),
                ('companyAddress', '{"street": "123 Safe Street", "city": "Crypto City", "state": "", "country": "Blockchain Land", "postalCode": ""}', 'Company physical address', 'contact', false),
                ('maintenanceMode', 'false', 'Toggle platform maintenance mode', 'system', false),
                ('allowedFileTypes', '["jpg", "png", "pdf"]', 'Allowed file types for uploads', 'system', false)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('platform_settings');
    }
} 