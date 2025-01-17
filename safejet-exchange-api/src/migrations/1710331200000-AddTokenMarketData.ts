import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenMarketData1710331200000 implements MigrationInterface {
  name = 'AddTokenMarketData1710331200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tokens"
      ADD COLUMN "coingeckoId" VARCHAR NULL,
      ADD COLUMN "marketCap" DECIMAL(40,18) NULL,
      ADD COLUMN "fullyDilutedMarketCap" DECIMAL(40,18) NULL,
      ADD COLUMN "volume24h" DECIMAL(40,18) NULL,
      ADD COLUMN "circulatingSupply" DECIMAL(40,18) NULL,
      ADD COLUMN "maxSupply" DECIMAL(40,18) NULL,
      ADD COLUMN "marketCapChange24h" DECIMAL(40,18) NULL,
      ADD COLUMN "marketCapChangePercent24h" DECIMAL(40,18) NULL,
      ADD COLUMN "volumeChangePercent24h" DECIMAL(40,18) NULL,
      ADD COLUMN "priceHistory" JSONB NULL
    `);

    await queryRunner.query(`
      UPDATE "tokens"
      SET "coingeckoId" = CASE "symbol"
        WHEN 'BTC' THEN 'bitcoin'
        WHEN 'ETH' THEN 'ethereum'
        WHEN 'USDT' THEN 'tether'
        WHEN 'USDC' THEN 'usd-coin'
        WHEN 'DAI' THEN 'dai'
        WHEN 'LINK' THEN 'chainlink'
        WHEN 'UNI' THEN 'uniswap'
        WHEN 'AAVE' THEN 'aave'
        WHEN 'COMP' THEN 'compound-governance-token'
        WHEN 'MKR' THEN 'maker'
        WHEN 'CAKE' THEN 'pancakeswap-token'
        WHEN 'AXS' THEN 'axie-infinity'
        WHEN 'ALPHA' THEN 'alpha-finance'
        WHEN 'AUTO' THEN 'auto'
        WHEN 'BURGER' THEN 'burger-swap'
        WHEN 'XVS' THEN 'venus'
        WHEN 'TRX' THEN 'tron'
        WHEN 'XRP' THEN 'ripple'
        WHEN 'BTT' THEN 'bittorrent'
        WHEN 'WIN' THEN 'wink'
        WHEN 'JST' THEN 'just'
        WHEN 'SAFEMOON' THEN 'safemoon-2'
        WHEN 'BAKE' THEN 'bakerytoken'
        WHEN 'SHIB' THEN 'shiba-inu'
        WHEN 'GRT' THEN 'the-graph'
        WHEN 'WBTC' THEN 'wrapped-bitcoin'
      END
      WHERE "symbol" IN (
        'BTC', 'ETH', 'USDT', 'USDC', 'DAI', 'LINK', 'UNI', 'AAVE', 'COMP',
        'MKR', 'CAKE', 'AXS', 'ALPHA', 'AUTO', 'BURGER', 'XVS', 'TRX', 'XRP',
        'BTT', 'WIN', 'JST', 'SAFEMOON', 'BAKE', 'SHIB', 'GRT', 'WBTC'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tokens"
      DROP COLUMN "coingeckoId",
      DROP COLUMN "marketCap",
      DROP COLUMN "fullyDilutedMarketCap",
      DROP COLUMN "volume24h",
      DROP COLUMN "circulatingSupply",
      DROP COLUMN "maxSupply",
      DROP COLUMN "marketCapChange24h",
      DROP COLUMN "marketCapChangePercent24h",
      DROP COLUMN "volumeChangePercent24h",
      DROP COLUMN "priceHistory"
    `);
  }
} 