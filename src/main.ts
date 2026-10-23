import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  await app.listen(port, '0.0.0.0');
  console.log(`GraphQL API: http://localhost:${port}/graphql`);
}

void bootstrap().catch((error: unknown) => {
  console.error('Application startup failed:', error);
  process.exitCode = 1;
});
