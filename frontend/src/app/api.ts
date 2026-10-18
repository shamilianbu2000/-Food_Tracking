import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Meal = 'BREAKFAST' | 'LUNCH' | 'DINNER';
export interface Employee { id: string; name: string; department: string; role: 'employee' | 'admin' }
export interface MealSlot { meal: Meal; start: string; end: string; cutoffMinutes?: number; cancelBy?: string }
export interface DayMenu { BREAKFAST: string[]; LUNCH: string[]; DINNER: string[] }
export interface MenuDay { date: string; menu: DayMenu }
export interface HistoryRow { tokenId: string; date: string; meal: Meal; status: 'issued' | 'unused' | 'expired'; issuedAt?: string }
export interface Counts { booked: number; issued: number; unused: number }
export interface Dashboard {
  from: string; to: string;
  perMeal: ({ meal: Meal } & Counts)[];
  perDay: ({ date: string; byMeal: ({ meal: Meal } & Counts)[] } & Counts)[];
}
export interface TokenQr { tokenId: string; employeeId: string; meal: Meal; date: string; issued: boolean; issuedAt?: string; payload: string; qr: string }
export interface VerifyResult { status: string; message: string; employee?: Employee }
export interface ReportRow { tokenId: string; employeeId: string; employee: string; department: string; meal: Meal; date: string; issued: boolean; issuedAt?: string }
export interface Note { id: number; employeeId: string; message: string }
export interface Toast { id: number; text: string }

export const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const API = 'http://localhost:3002/api';

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  readonly employees = signal<Employee[]>([]);
  readonly user = signal<Employee | null>(null);
  readonly toasts = signal<Toast[]>([]);
  readonly ready = signal(false);
  private lastNote = 0;
  private timer?: ReturnType<typeof setInterval>;

  init(): void {
    this.http.get<Employee[]>(`${API}/employees`).subscribe((list) => {
      this.employees.set(list);
      let saved: string | null = null;
      try { saved = localStorage.getItem('demoUser'); } catch { /* storage unavailable */ }
      this.switchUser(list.find((e) => e.id === saved)?.id ?? list[0].id);
      this.ready.set(true);
    });
  }

  switchUser(id: string): void {
    this.user.set(this.employees().find((e) => e.id === id) ?? null);
    try { localStorage.setItem('demoUser', id); } catch { /* storage unavailable */ }
    this.lastNote = 0;
    clearInterval(this.timer);
    this.poll();
    this.timer = setInterval(() => this.poll(), 3000);
  }

  toast(text: string): void {
    const t = { id: Date.now() + Math.random(), text };
    this.toasts.update((l) => [...l, t]);
    setTimeout(() => this.toasts.update((l) => l.filter((x) => x.id !== t.id)), 5000);
  }

  /** Stand-in for FCM push: poll for new notifications of the current user. */
  private poll(): void {
    const u = this.user();
    if (!u) return;
    this.http.get<Note[]>(`${API}/notifications`, { params: { employeeId: u.id, since: this.lastNote } })
      .subscribe((notes) => notes.forEach((n) => { this.lastNote = n.id; this.toast(n.message); }));
  }

  meals() { return this.http.get<MealSlot[]>(`${API}/meals`); }
  tokens(employeeId?: string) { return this.http.get<TokenQr[]>(`${API}/tokens`, { params: employeeId ? { employeeId } : {} }); }
  book(employeeId: string, meal: Meal) { return this.http.post<TokenQr>(`${API}/tokens/book`, { employeeId, meal }); }
  verify(payload: string, at?: string) { return this.http.post<VerifyResult>(`${API}/verify`, { payload, at: at || undefined }); }
  runDaily() { return this.http.post<{ generated: number; total: number }>(`${API}/jobs/daily`, {}); }
  cancel(employeeId: string, tokenId: string, at?: string) { return this.http.post<{ cancelled: boolean }>(`${API}/tokens/cancel`, { employeeId, tokenId, at: at || undefined }); }
  menu(from?: string, days = 7) { return this.http.get<MenuDay[]>(`${API}/menu`, { params: from ? { from, days } : { days } }); }
  setMenu(adminId: string, date: string, meal: Meal, items: string[]) { return this.http.put<MenuDay>(`${API}/menu`, { adminId, date, meal, items }); }
  setCutoff(adminId: string, meal: Meal, minutes: number) { return this.http.put<MealSlot[]>(`${API}/cutoffs`, { adminId, meal, minutes }); }
  history(employeeId: string) { return this.http.get<HistoryRow[]>(`${API}/history`, { params: { employeeId } }); }
  dashboard(days = 7) { return this.http.get<Dashboard>(`${API}/dashboard`, { params: { days } }); }
  report() { return this.http.get<ReportRow[]>(`${API}/reports/tokens`); }
}
