import { Component, inject, signal } from '@angular/core';
import { Api, Counts, Dashboard } from './api';

@Component({
  selector: 'app-dashboard',
  template: `
    <h2>Meal-count dashboard</h2>
    <div class="actions">
      <label>Days <select (change)="load(+$any($event.target).value)">
        @for (d of [3, 7, 14]; track d) { <option [value]="d" [selected]="d === 7">Last {{ d }}</option> }
      </select></label>
      <button (click)="load(days)">Refresh</button>
    </div>
    @if (data(); as d) {
      <p class="legend"><span class="sw booked"></span>Booked <span class="sw issued"></span>Issued <span class="sw unused"></span>Unused ({{ d.from }} to {{ d.to }})</p>
      <h3>Per meal</h3>
      <div class="bars">
        @for (m of d.perMeal; track m.meal) {
          <div class="bar-group">
            <div class="bar-set">
              <div class="bar booked" [style.height.%]="pct(m.booked, max(d.perMeal))"><span>{{ m.booked }}</span></div>
              <div class="bar issued" [style.height.%]="pct(m.issued, max(d.perMeal))"><span>{{ m.issued }}</span></div>
              <div class="bar unused" [style.height.%]="pct(m.unused, max(d.perMeal))"><span>{{ m.unused }}</span></div>
            </div>
            <div class="bar-label">{{ m.meal }}</div>
          </div>
        }
      </div>
      <h3>Per day</h3>
      <div class="bars">
        @for (m of d.perDay; track m.date) {
          <div class="bar-group">
            <div class="bar-set">
              <div class="bar booked" [style.height.%]="pct(m.booked, max(d.perDay))"><span>{{ m.booked }}</span></div>
              <div class="bar issued" [style.height.%]="pct(m.issued, max(d.perDay))"><span>{{ m.issued }}</span></div>
              <div class="bar unused" [style.height.%]="pct(m.unused, max(d.perDay))"><span>{{ m.unused }}</span></div>
            </div>
            <div class="bar-label">{{ m.date.slice(5) }}</div>
          </div>
        }
      </div>
      <h3>Per day and meal</h3>
      <table>
        <thead><tr><th>Date</th><th>Breakfast (b/i/u)</th><th>Lunch (b/i/u)</th><th>Dinner (b/i/u)</th></tr></thead>
        <tbody>
          @for (r of d.perDay; track r.date) {
            <tr><td>{{ r.date }}</td>@for (m of r.byMeal; track m.meal) { <td>{{ m.booked }} / {{ m.issued }} / {{ m.unused }}</td> }</tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class DashboardPage {
  private api = inject(Api);
  protected data = signal<Dashboard | null>(null);
  protected days = 7;
  constructor() { this.load(7); }
  protected load(days: number): void { this.days = days; this.api.dashboard(days).subscribe((d) => this.data.set(d)); }
  protected max(rows: Counts[]): number { return Math.max(1, ...rows.map((r) => r.booked)); }
  protected pct(v: number, max: number): number { return (v / max) * 100; }
}
