import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TokensSeederService } from '../seeders/tokens.seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seederService = app.get(TokensSeederService);
    await seederService.seed();
    console.log('Tokens seeded successfully!');
  } catch (error) {
    console.error('Error seeding tokens:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap(); 