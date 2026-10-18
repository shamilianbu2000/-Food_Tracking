import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule, { cors: true });
await app.listen(process.env.PORT ?? 3002);
