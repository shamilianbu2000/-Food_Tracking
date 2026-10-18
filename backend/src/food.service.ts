import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  EMPLOYEES, MEAL_SLOTS, Employee, Meal, Notification, QrPayload, Token, VerifyResult,
} from './models.js';

const today = (): string => new Date().toISOString().slice(0, 10);
const nowHm = (): string => new Date().toTimeString().slice(0, 5);

@Injectable()
export class FoodService {
  private readonly log = new Logger(FoodService.name);
  private tokens = new Map<string, Token>();
  private notifications: Notification[] = [];

  employees(): Employee[] { return EMPLOYEES; }
  meals() { return MEAL_SLOTS; }

  private employee(id: string): Employee {
    const e = EMPLOYEES.find((x) => x.id === id);
    if (!e) throw new NotFoundException(`Unknown employee ${id}`);
    return e;
  }

  private notify(employeeId: string, message: string): void {
    this.notifications.push({ id: this.notifications.length + 1, employeeId, message, at: new Date().toISOString() });
  }

  private find(employeeId: string, meal: Meal, date: string): Token | undefined {
    return [...this.tokens.values()].find((t) => t.employeeId === employeeId && t.meal === meal && t.date === date);
  }

  /** Idempotent: returns the existing token if already booked. */
  book(employeeId: string, meal: Meal): Token {
    this.employee(employeeId);
    if (!MEAL_SLOTS.some((s) => s.meal === meal)) throw new BadRequestException('Invalid meal');
    const date = today();
    const existing = this.find(employeeId, meal, date);
    if (existing) return existing;
    const token: Token = { tokenId: randomUUID(), employeeId, meal, date, issued: false };
    this.tokens.set(token.tokenId, token);
    this.notify(employeeId, `Your ${meal.toLowerCase()} token for ${date} is ready.`);
    return token;
  }

  payloadOf(t: Token): string {
    const p: QrPayload = { tokenId: t.tokenId, employeeId: t.employeeId, meal: t.meal, date: t.date };
    return Buffer.from(JSON.stringify(p)).toString('base64');
  }

  async withQr(t: Token) {
    const payload = this.payloadOf(t);
    return { ...t, payload, qr: await QRCode.toDataURL(payload, { margin: 1, width: 240 }) };
  }

  list(employeeId?: string, date = today()): Token[] {
    return [...this.tokens.values()].filter((t) => t.date === date && (!employeeId || t.employeeId === employeeId));
  }

  verify(payload: string, at?: string): VerifyResult {
    let p: QrPayload;
    try {
      p = JSON.parse(Buffer.from(payload.trim(), 'base64').toString('utf8')) as QrPayload;
      if (!p.tokenId || !p.meal) throw new Error('bad');
    } catch {
      return { status: 'INVALID', message: 'Payload is not a valid Base64 token.' };
    }
    const token = this.tokens.get(p.tokenId);
    if (!token || token.employeeId !== p.employeeId || token.meal !== p.meal || token.date !== p.date) {
      return { status: 'INVALID', message: 'Token not found or payload tampered.' };
    }
    const employee = this.employee(token.employeeId);
    if (token.date !== today()) return { status: 'EXPIRED', message: `Token was for ${token.date}.`, token, employee };
    if (token.issued) return { status: 'ALREADY_USED', message: `Already issued at ${token.issuedAt}.`, token, employee };
    const time = at ?? nowHm();
    const slot = MEAL_SLOTS.find((s) => s.meal === token.meal)!;
    if (time < slot.start || time > slot.end) {
      return { status: 'WRONG_MEAL_WINDOW', message: `${token.meal} is served ${slot.start}-${slot.end}; scanned at ${time}.`, token, employee };
    }
    token.issued = true;
    token.issuedAt = new Date().toISOString();
    this.notify(token.employeeId, `Your ${token.meal.toLowerCase()} was issued. Enjoy!`);
    return { status: 'VALID', message: 'Meal issued.', token, employee };
  }

  @Cron('0 0 6 * * *')
  dailyJob(): { generated: number; total: number } {
    let generated = 0;
    for (const e of EMPLOYEES.filter((x) => x.role === 'employee')) {
      for (const s of MEAL_SLOTS) {
        if (!this.find(e.id, s.meal, today())) { this.book(e.id, s.meal); generated++; }
      }
    }
    this.log.log(`Daily job generated ${generated} tokens`);
    return { generated, total: this.list().length };
  }

  report() {
    return this.list().map((t) => ({ ...t, employee: this.employee(t.employeeId).name, department: this.employee(t.employeeId).department }));
  }

  notificationsFor(employeeId: string, since = 0): Notification[] {
    return this.notifications.filter((n) => n.employeeId === employeeId && n.id > since);
  }

  async excel(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Meal Report');
    ws.columns = [
      { header: 'Date', key: 'date', width: 12 }, { header: 'Employee ID', key: 'employeeId', width: 12 },
      { header: 'Employee', key: 'employee', width: 20 }, { header: 'Department', key: 'department', width: 16 },
      { header: 'Meal', key: 'meal', width: 12 }, { header: 'Token ID', key: 'tokenId', width: 38 },
      { header: 'Issued', key: 'issued', width: 8 }, { header: 'Issued At', key: 'issuedAt', width: 26 },
    ];
    ws.getRow(1).font = { bold: true };
    this.report().forEach((r) => ws.addRow({ ...r, issued: r.issued ? 'Yes' : 'No' }));
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async pdf(): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));
    doc.fontSize(18).text(`Meal tokens - ${today()}`).moveDown();
    const cellW = 170, cellH = 190;
    let i = 0;
    for (const t of this.list()) {
      const col = i % 3, row = Math.floor(i / 3) % 4;
      if (i > 0 && i % 12 === 0) doc.addPage();
      const x = 36 + col * (cellW + 10), y = (i % 12 < 3 && Math.floor(i / 12) === 0 ? 80 : 36) + row * cellH;
      const png = await QRCode.toBuffer(this.payloadOf(t), { margin: 1, width: 300 });
      doc.image(png, x + 15, y, { width: 140 });
      doc.fontSize(9).text(`${this.employee(t.employeeId).name} (${t.employeeId})`, x, y + 145, { width: cellW, align: 'center' });
      doc.text(t.meal, x, y + 158, { width: cellW, align: 'center' });
      i++;
    }
    doc.end();
    return done;
  }
}
