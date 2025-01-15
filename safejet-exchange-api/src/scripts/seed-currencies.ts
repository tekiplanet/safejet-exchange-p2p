import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CurrencySeederService } from '../seeders/currency.seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('Starting currency seeding...');
    const seeder = app.get(CurrencySeederService);
    await seeder.seed();
    console.log('Currency seeding completed successfully');
  } catch (error) {
    console.error('Currency seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 