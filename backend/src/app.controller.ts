import { Body, Controller, Get, Header, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from "express";
import { FoodService } from './food.service.js';
import type { Meal } from './models.js';

@Controller('api')
export class AppController {
  constructor(private readonly food: FoodService) {}

  @Get('employees') employees() { return this.food.employees(); }
  @Get('meals') meals() { return this.food.meals(); }

  @Post('tokens/book')
  book(@Body() b: { employeeId: string; meal: Meal }) { return this.food.withQr(this.food.book(b.employeeId, b.meal)); }

  @Get('tokens')
  async tokens(@Query('employeeId') employeeId?: string) {
    return Promise.all(this.food.list(employeeId).map((t) => this.food.withQr(t)));
  }

  @Post('tokens/cancel')
  cancel(@Body() b: { employeeId: string; tokenId: string; at?: string }) { return this.food.cancel(b.employeeId, b.tokenId, b.at); }

  @Get('menu')
  menu(@Query('from') from?: string, @Query('days') days?: string) { return this.food.menuRange(from, days ? Number(days) : 7); }

  @Put('menu')
  setMenu(@Body() b: { adminId: string; date: string; meal: Meal; items: string[] }) { return this.food.setMenu(b.adminId, b.date, b.meal, b.items); }

  @Put('cutoffs')
  setCutoff(@Body() b: { adminId: string; meal: Meal; minutes: number }) { return this.food.setCutoff(b.adminId, b.meal, b.minutes); }

  @Get('history')
  history(@Query('employeeId') employeeId: string) { return this.food.history(employeeId); }

  @Get('dashboard')
  dashboard(@Query('days') days?: string) { return this.food.dashboard(days ? Number(days) : 7); }

  @Post('verify')
  verify(@Body() b: { payload: string; at?: string }) { return this.food.verify(b.payload ?? '', b.at); }

  @Post('jobs/daily') runDaily() { return this.food.dailyJob(); }
  @Get('reports/tokens') report() { return this.food.report(); }
  @Get('notifications')
  notifications(@Query('employeeId') id: string, @Query('since') since?: string) {
    return this.food.notificationsFor(id, Number(since ?? 0));
  }

  @Get('reports/tokens.xlsx')
  async xlsx(@Res() res: Response) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="meal-report.xlsx"',
    }).send(await this.food.excel());
  }

  @Get('reports/qr.pdf')
  async pdf(@Res() res: Response) {
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="qr-codes.pdf"' })
      .send(await this.food.pdf());
  }
}
