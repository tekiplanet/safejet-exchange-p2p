import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaymentMethodsSeederService } from '../seeders/payment-methods.seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seederService = app.get(PaymentMethodsSeederService);
    await seederService.seed();
    console.log('Payment methods seeded successfully!');
  } catch (error) {
    console.error('Error seeding payment methods:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap(); 