import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  DEFAULT_CUTOFF_MINUTES, DayMenu, EMPLOYEES, MEAL_SLOTS, SEED_MENU, Employee, Meal, Notification, QrPayload, Token, TokenStatus, VerifyResult,
} from './models.js';

const pad2 = (n: number): string => String(n).padStart(2, '0');
/** Local calendar date (same clock as nowHm, so date and time never disagree around midnight/UTC offsets). */
const today = (): string => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const nowHm = (): string => new Date().toTimeString().slice(0, 5);
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const toMinutes = (hm: string): number => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const toHm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

@Injectable()
export class FoodService {
  private readonly log = new Logger(FoodService.name);
  private tokens = new Map<string, Token>();
  private notifications: Notification[] = [];
  private menu = new Map<string, DayMenu>();
  private cutoffs: Record<Meal, number> = { BREAKFAST: DEFAULT_CUTOFF_MINUTES, LUNCH: DEFAULT_CUTOFF_MINUTES, DINNER: DEFAULT_CUTOFF_MINUTES };

  constructor() { this.seed(); }

  /** Seeds a menu for the current week (Mon-Sun) and a few days of token history. */
  private seed(): void {
    const t = today();
    const dow = (new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const monday = addDays(t, -dow);
    SEED_MENU.forEach((m, i) => this.menu.set(addDays(monday, i), structuredClone(m)));
    const workers = EMPLOYEES.filter((e) => e.role === 'employee');
    for (let back = 1; back <= 5; back++) {
      const date = addDays(t, -back);
      workers.forEach((e, ei) => MEAL_SLOTS.forEach((s, si) => {
        if ((back + ei + si) % 4 === 0) return; // not everyone books every meal
        const issued = (back * 3 + ei * 5 + si * 7) % 5 !== 0; // some left unused -> expired
        const token: Token = { tokenId: randomUUID(), employeeId: e.id, meal: s.meal, date, issued };
        if (issued) token.issuedAt = `${date}T${s.start}:00.000Z`;
        this.tokens.set(token.tokenId, token);
      }));
    }
  }

  employees(): Employee[] { return EMPLOYEES; }
  meals() { return MEAL_SLOTS.map((s) => ({ ...s, cutoffMinutes: this.cutoffs[s.meal], cancelBy: toHm(toMinutes(s.start) - this.cutoffs[s.meal]) })); }

  // ---- weekly menu ----
  menuRange(from?: string, days = 7): { date: string; menu: DayMenu }[] {
    if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new BadRequestException('from must be YYYY-MM-DD');
    const start = from ?? this.weekStart();
    return Array.from({ length: Math.min(Math.max(days, 1), 31) }, (_, i) => {
      const date = addDays(start, i);
      return { date, menu: this.menu.get(date) ?? { BREAKFAST: [], LUNCH: [], DINNER: [] } };
    });
  }

  private weekStart(): string {
    const t = today();
    return addDays(t, -((new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7));
  }

  private requireAdmin(adminId?: string): void {
    const e = EMPLOYEES.find((x) => x.id === adminId);
    if (!e) throw new NotFoundException(`Unknown employee ${adminId}`);
    if (e.role !== 'admin') throw new ForbiddenException('Admin only.');
  }

  setMenu(adminId: string, date: string, meal: Meal, items: string[]) {
    this.requireAdmin(adminId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || Number.isNaN(Date.parse(date))) throw new BadRequestException('date must be YYYY-MM-DD');
    if (!MEAL_SLOTS.some((s) => s.meal === meal)) throw new BadRequestException('Invalid meal');
    if (!Array.isArray(items) || items.some((i) => typeof i !== 'string')) throw new BadRequestException('items must be a string array');
    const day = this.menu.get(date) ?? { BREAKFAST: [], LUNCH: [], DINNER: [] };
    day[meal] = items.map((i) => i.trim()).filter(Boolean);
    this.menu.set(date, day);
    return { date, menu: day };
  }

  setCutoff(adminId: string, meal: Meal, minutes: number) {
    this.requireAdmin(adminId);
    if (!MEAL_SLOTS.some((s) => s.meal === meal)) throw new BadRequestException('Invalid meal');
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 720) throw new BadRequestException('minutes must be an integer 0-720');
    this.cutoffs[meal] = minutes;
    return this.meals();
  }

  // ---- cancel ----
  cancel(employeeId: string, tokenId: string, at?: string): { cancelled: true; tokenId: string; meal: Meal } {
    this.employee(employeeId);
    if (at !== undefined && !HM.test(at)) throw new BadRequestException('at must be HH:mm');
    const token = this.tokens.get(tokenId);
    if (!token) throw new NotFoundException('Token not found.');
    if (token.employeeId !== employeeId) throw new ForbiddenException('You can only cancel your own token.');
    if (token.issued) throw new BadRequestException('Token already issued; it cannot be cancelled.');
    if (token.date !== today()) throw new BadRequestException(`Token was for ${token.date}; it cannot be cancelled.`);
    const slot = MEAL_SLOTS.find((s) => s.meal === token.meal)!;
    const cancelBy = toHm(Math.max(0, toMinutes(slot.start) - this.cutoffs[token.meal]));
    const time = at ?? nowHm();
    if (time >= cancelBy) {
      throw new BadRequestException(`Cancellation cutoff passed: ${token.meal} can be cancelled only before ${cancelBy} (${this.cutoffs[token.meal]} min before ${slot.start}); it is ${time}.`);
    }
    this.tokens.delete(tokenId);
    this.notify(employeeId, `Your ${token.meal.toLowerCase()} booking for ${token.date} was cancelled.`);
    return { cancelled: true, tokenId, meal: token.meal };
  }

  // ---- history & dashboard ----
  private statusOf(t: Token): TokenStatus {
    if (t.issued) return 'issued';
    return t.date < today() ? 'expired' : 'unused';
  }

  history(employeeId: string) {
    this.employee(employeeId);
    return [...this.tokens.values()]
      .filter((t) => t.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date) || MEAL_SLOTS.findIndex((s) => s.meal === b.meal) - MEAL_SLOTS.findIndex((s) => s.meal === a.meal))
      .map((t) => ({ tokenId: t.tokenId, date: t.date, meal: t.meal, status: this.statusOf(t), issuedAt: t.issuedAt }));
  }

  /** Booked / issued / unused counts per meal and per day over the last `days` days (ending today). */
  dashboard(days = 7) {
    const n = Math.min(Math.max(Number.isFinite(days) ? Math.floor(days) : 7, 1), 31);
    const dates = Array.from({ length: n }, (_, i) => addDays(today(), i - n + 1));
    const count = (ts: Token[]) => { const issued = ts.filter((t) => t.issued).length; return { booked: ts.length, issued, unused: ts.length - issued }; };
    const inRange = [...this.tokens.values()].filter((t) => dates.includes(t.date));
    return {
      from: dates[0], to: dates[n - 1],
      perMeal: MEAL_SLOTS.map((s) => ({ meal: s.meal, ...count(inRange.filter((t) => t.meal === s.meal)) })),
      perDay: dates.map((date) => ({
        date, ...count(inRange.filter((t) => t.date === date)),
        byMeal: MEAL_SLOTS.map((s) => ({ meal: s.meal, ...count(inRange.filter((t) => t.date === date && t.meal === s.meal)) })),
      })),
    };
  }

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
    if (at !== undefined && !HM.test(at)) return { status: 'INVALID', message: 'Simulated time must be HH:mm (e.g. 13:00).' };
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
