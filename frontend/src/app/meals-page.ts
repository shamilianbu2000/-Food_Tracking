import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { Api, localToday, MealSlot, MenuDay, TokenQr } from './api';

@Component({
  selector: 'app-meals',
  template: `
    <h2>Today's meals for {{ api.user()?.name }}</h2>
    <div class="actions">
      <label>Simulate time for cancel (HH:mm, optional) <input [value]="at()" (input)="at.set($any($event.target).value)" placeholder="e.g. 09:00" /></label>
    </div>
    <div class="grid">
      @for (s of slots(); track s.meal) {
        <div class="card">
          <h3>{{ s.meal }}</h3>
          <p>{{ s.start }} - {{ s.end }}@if (s.cancelBy) { <br /><small>Cancel before {{ s.cancelBy }}</small> }</p>
          @if (todayMenu()?.[s.meal]?.length) { <p class="menu"><strong>Menu:</strong> {{ todayMenu()![s.meal].join(', ') }}</p> }
          @if (tokenFor(s.meal); as t) {
            <img [src]="t.qr" alt="QR" width="180" height="180" />
            <p [class]="t.issued ? 'bad' : 'ok'">{{ t.issued ? 'Issued' : 'Ready' }}</p>
            <details><summary>QR payload</summary><textarea readonly rows="4">{{ t.payload }}</textarea></details>
            @if (!t.issued) { <button class="danger" (click)="cancel(t)">Cancel booking</button> }
          } @else {
            <button (click)="book(s)">Get token</button>
          }
        </div>
      }
    </div>
    <h2>This week's menu</h2>
    <table>
      <thead><tr><th>Day</th>@for (s of slots(); track s.meal) { <th>{{ s.meal }}</th> }</tr></thead>
      <tbody>
        @for (d of week(); track d.date) {
          <tr [class.today]="d.date === todayStr()"><td>{{ d.date }}</td>
            @for (s of slots(); track s.meal) { <td>{{ d.menu[s.meal].join(', ') || '-' }}</td> }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class MealsPage implements OnDestroy {
  protected api = inject(Api);
  protected slots = signal<MealSlot[]>([]);
  private tokens = signal<TokenQr[]>([]);
  protected at = signal('');
  protected week = signal<MenuDay[]>([]);
  protected todayStr = signal(localToday());
  protected todayMenu = () => this.week().find((d) => d.date === this.todayStr())?.menu;

  constructor() {
    this.api.meals().subscribe((s) => this.slots.set(s));
    this.api.menu().subscribe((w) => this.week.set(w));
    effect(() => { this.load(); });
    this.timer = setInterval(() => this.load(), 3000);
  }
  private timer?: ReturnType<typeof setInterval>;
  ngOnDestroy(): void { clearInterval(this.timer); }

  private load(): void {
    const u = this.api.user();
    if (u) this.api.tokens(u.id).subscribe((t) => this.tokens.set(t));
  }
  protected tokenFor(meal: string): TokenQr | undefined { return this.tokens().find((t) => t.meal === meal); }
  protected book(s: MealSlot): void {
    this.api.book(this.api.user()!.id, s.meal).subscribe({ next: () => this.load(), error: (e) => this.api.toast(e.error?.message ?? 'Booking failed') });
  }
  protected cancel(t: TokenQr): void {
    this.api.cancel(this.api.user()!.id, t.tokenId, this.at().trim()).subscribe({
      next: () => { this.api.toast('Booking cancelled.'); this.load(); },
      error: (e) => this.api.toast(e.error?.message ?? 'Cancel failed'),
    });
  }
}
