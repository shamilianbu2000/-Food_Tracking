import { Component, effect, inject, signal } from '@angular/core';
import { Api, MealSlot, TokenQr } from './api';

@Component({
  selector: 'app-meals',
  template: `
    <h2>Today's meals for {{ api.user()?.name }}</h2>
    <div class="grid">
      @for (s of slots(); track s.meal) {
        <div class="card">
          <h3>{{ s.meal }}</h3>
          <p>{{ s.start }} - {{ s.end }}</p>
          @if (tokenFor(s.meal); as t) {
            <img [src]="t.qr" alt="QR" width="180" height="180" />
            <p [class]="t.issued ? 'bad' : 'ok'">{{ t.issued ? 'Issued' : 'Ready' }}</p>
            <details><summary>QR payload</summary><textarea readonly rows="4">{{ t.payload }}</textarea></details>
          } @else {
            <button (click)="book(s)">Get token</button>
          }
        </div>
      }
    </div>
  `,
})
export class MealsPage {
  protected api = inject(Api);
  protected slots = signal<MealSlot[]>([]);
  private tokens = signal<TokenQr[]>([]);

  constructor() {
    this.api.meals().subscribe((s) => this.slots.set(s));
    effect(() => { this.load(); });
    setInterval(() => this.load(), 3000);
  }

  private load(): void {
    const u = this.api.user();
    if (u) this.api.tokens(u.id).subscribe((t) => this.tokens.set(t));
  }
  protected tokenFor(meal: string): TokenQr | undefined { return this.tokens().find((t) => t.meal === meal); }
  protected book(s: MealSlot): void {
    this.api.book(this.api.user()!.id, s.meal).subscribe(() => this.load());
  }
}
