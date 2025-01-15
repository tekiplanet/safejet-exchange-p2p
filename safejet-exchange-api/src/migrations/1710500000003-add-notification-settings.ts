import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationSettings1710500000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
        "Trading": {
          "Order Updates": true,
          "Price Alerts": true,
          "Trade Confirmations": true,
          "Market Updates": false
        },
        "P2P": {
          "New Messages": true,
          "Order Status": true,
          "Payment Confirmations": true,
          "Dispute Updates": true
        },
        "Security": {
          "Login Alerts": true,
          "Device Changes": true,
          "Password Changes": true,
          "Suspicious Activity": true
        },
        "Wallet": {
          "Deposits": true,
          "Withdrawals": true,
          "Transfer Confirmations": false,
          "Balance Updates": true
        }
      }'::jsonb NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS notification_settings
    `);
  }
} 