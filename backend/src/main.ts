import * as fs from 'fs';
import * as path from 'path';

// Minimal .env loader — no dotenv package required
try {
  const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^\s*([^#\s=][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env absent — rely on system env vars */ }

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
