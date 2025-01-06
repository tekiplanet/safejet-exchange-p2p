import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKYCLevels1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create KYC Levels table
    await queryRunner.query(`
      CREATE TABLE "kyc_levels" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "level" integer NOT NULL,
        "title" varchar NOT NULL,
        "requirements" text[] NOT NULL,
        "benefits" text[] NOT NULL,
        "limits" jsonb NOT NULL,
        "features" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Add KYC columns to users table
    // await queryRunner.query(`
    //   ALTER TABLE "users" 
    //     ADD COLUMN "kyc_level" integer NOT NULL DEFAULT 0,
    //     ADD COLUMN "kyc_level_id" uuid,
    //     ADD COLUMN "kyc_data" jsonb,
    //     ADD CONSTRAINT "fk_kyc_level" 
    //     FOREIGN KEY ("kyc_level_id") 
    //     REFERENCES "kyc_levels"("id")
    // `);

    // Insert default KYC levels
    await queryRunner.query(`
      INSERT INTO "kyc_levels" (level, title, requirements, benefits, limits, features) VALUES
      (0, 'Unverified', 
        ARRAY['Email verification'],
        ARRAY['View market data', 'Create watchlist', 'Deposit up to $1,000', 'No withdrawals'],
        '{"deposit": {"daily": 1000, "monthly": 5000}, "withdrawal": {"daily": 0, "monthly": 0}, "p2p": {"daily": 0, "monthly": 0}}'::jsonb,
        '{"canTrade": false, "canDeposit": true, "canWithdraw": false, "canUseP2P": false, "canUseFiat": false, "hasVipSupport": false, "hasReducedFees": false}'::jsonb
      ),
      (1, 'Basic', 
        ARRAY['Email verification', 'Phone verification'],
        ARRAY['Deposit crypto', 'Withdraw up to $1,000/day', 'Basic trading features'],
        '{"deposit": {"daily": 5000, "monthly": 50000}, "withdrawal": {"daily": 1000, "monthly": 10000}, "p2p": {"daily": 0, "monthly": 0}}'::jsonb,
        '{"canTrade": true, "canDeposit": true, "canWithdraw": true, "canUseP2P": false, "canUseFiat": false, "hasVipSupport": false, "hasReducedFees": false}'::jsonb
      ),
      (2, 'Verified', 
        ARRAY['Identity verification', 'Address proof'],
        ARRAY['Withdraw up to $50,000/day', 'P2P trading', 'Fiat deposits'],
        '{"deposit": {"daily": 50000, "monthly": 500000}, "withdrawal": {"daily": 50000, "monthly": 500000}, "p2p": {"daily": 10000, "monthly": 100000}}'::jsonb,
        '{"canTrade": true, "canDeposit": true, "canWithdraw": true, "canUseP2P": true, "canUseFiat": true, "hasVipSupport": false, "hasReducedFees": false}'::jsonb
      ),
      (3, 'Advanced', 
        ARRAY['Advanced verification', 'Video call verification'],
        ARRAY['Unlimited withdrawals', 'VIP support', 'Lower trading fees', 'Higher leverage'],
        '{"deposit": {"daily": -1, "monthly": -1}, "withdrawal": {"daily": -1, "monthly": -1}, "p2p": {"daily": -1, "monthly": -1}}'::jsonb,
        '{"canTrade": true, "canDeposit": true, "canWithdraw": true, "canUseP2P": true, "canUseFiat": true, "hasVipSupport": true, "hasReducedFees": true}'::jsonb
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint first
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "fk_kyc_level"
    `);

    // // Remove KYC columns from users table
    // await queryRunner.query(`
    //   ALTER TABLE "users" 
    //     DROP COLUMN "kyc_level",
    //     DROP COLUMN "kyc_level_id",
    //     DROP COLUMN "kyc_data"
    // `);

    // Drop KYC Levels table
    await queryRunner.query(`DROP TABLE "kyc_levels"`);
  }
} 