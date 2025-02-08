import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateWalletKeysForAdmin1710600002000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop any existing trigger and function first
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS wallet_key_user_reference_trigger ON wallet_keys;
            DROP FUNCTION IF EXISTS check_wallet_key_user_reference;
        `);

        // Create the trigger function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION check_wallet_key_user_reference()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW."userType" = 'user' THEN
                    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW."userId") THEN
                        RAISE EXCEPTION 'User ID not found in users table';
                    END IF;
                ELSIF NEW."userType" = 'admin' THEN
                    IF NOT EXISTS (SELECT 1 FROM admins WHERE id = NEW."userId") THEN
                        RAISE EXCEPTION 'Admin ID not found in admins table';
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create the trigger
        await queryRunner.query(`
            CREATE TRIGGER wallet_key_user_reference_trigger
            BEFORE INSERT OR UPDATE ON wallet_keys
            FOR EACH ROW
            EXECUTE FUNCTION check_wallet_key_user_reference();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the trigger and function
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS wallet_key_user_reference_trigger ON wallet_keys;
            DROP FUNCTION IF EXISTS check_wallet_key_user_reference;
        `);
    }
} 