import { Client } from 'pg';
import { config } from 'dotenv';

config();

async function dropSchema() {
  console.log('Starting schema drop process...');
  
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // Reset search path
    await client.query('SET search_path TO public');
    
    // Drop all tables first
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    
    console.log('Dropped all tables');
    
    // Drop and recreate schema
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    
    // Set proper permissions
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    
    // Set search path
    await client.query('ALTER DATABASE safejet_exchange SET search_path TO public');
    
    console.log('Schema dropped and recreated successfully');
  } catch (error) {
    console.error('Error dropping schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

dropSchema()
  .then(() => {
    console.log('Schema drop completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema drop failed:', error);
    process.exit(1);
  }); 