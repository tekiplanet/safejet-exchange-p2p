import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutoResponses1710500000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE p2p_trader_settings 
      ADD COLUMN IF NOT EXISTS auto_responses JSONB DEFAULT '[
        {
          "id": "1",
          "message": "I have made the payment, please check.",
          "type": "Payment",
          "icon": "payment",
          "color": "#4CAF50"
        },
        {
          "id": "2",
          "message": "Please provide your payment details.",
          "type": "Request",
          "icon": "request_page",
          "color": "#2196F3"
        },
        {
          "id": "3",
          "message": "Payment received, releasing crypto now.",
          "type": "Confirmation",
          "icon": "check_circle",
          "color": "#9C27B0"
        },
        {
          "id": "4",
          "message": "Thank you for trading with me!",
          "type": "Thanks",
          "icon": "favorite",
          "color": "#E91E63"
        }
      ]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE p2p_trader_settings 
      DROP COLUMN IF EXISTS auto_responses
    `);
  }
} 