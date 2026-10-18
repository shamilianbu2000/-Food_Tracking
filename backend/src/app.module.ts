import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { FoodService } from './food.service.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [FoodService],
})
export class AppModule {}
