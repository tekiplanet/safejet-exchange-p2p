import { registerAs } from '@nestjs/config';

export default () => ({
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'safejet_exchange',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
  },
});
