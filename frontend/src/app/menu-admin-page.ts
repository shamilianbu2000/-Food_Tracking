import { Component, inject, signal } from '@angular/core';
import { Api, Meal, MealSlot, MenuDay } from './api';

@Component({
  selector: 'app-menu-admin',
  template: `
    <h2>Weekly menu planner</h2>
    @if (api.user()?.role !== 'admin') {
      <p class="bad">Switch to an admin to edit the menu.</p>
    }
    <p>Enter items separated by commas, then press Save for that meal.</p>
    <table>
      <thead><tr><th>Day</th>@for (s of slots(); track s.meal) { <th>{{ s.meal }}</th> }</tr></thead>
      <tbody>
        @for (d of week(); track d.date) {
          <tr><td>{{ d.date }}</td>
            @for (s of slots(); track s.meal) {
              <td>
                <input #box [value]="d.menu[s.meal].join(', ')" />
                <button (click)="save(d.date, s.meal, box.value)">Save</button>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <h3>Cancellation cutoff (minutes before window start)</h3>
    <div class="actions">
      @for (s of slots(); track s.meal) {
        <label>{{ s.meal }} (now {{ s.cutoffMinutes }}; cancel before {{ s.cancelBy }})
          <input #mins type="number" min="0" max="720" [value]="s.cutoffMinutes" />
          <button (click)="cutoff(s.meal, +mins.value)">Set</button>
        </label>
      }
    </div>
  `,
})
export class MenuAdminPage {
  protected api = inject(Api);
  protected week = signal<MenuDay[]>([]);
  protected slots = signal<MealSlot[]>([]);
  constructor() {
    this.api.menu().subscribe((w) => this.week.set(w));
    this.api.meals().subscribe((s) => this.slots.set(s));
  }
  protected save(date: string, meal: Meal, text: string): void {
    const items = text.split(',').map((x) => x.trim()).filter(Boolean);
    this.api.setMenu(this.api.user()!.id, date, meal, items).subscribe({
      next: (d) => { this.week.update((w) => w.map((x) => (x.date === date ? d : x))); this.api.toast(`Saved ${meal.toLowerCase()} menu for ${date}`); },
      error: (e) => this.api.toast(e.error?.message ?? 'Save failed'),
    });
  }
  protected cutoff(meal: Meal, minutes: number): void {
    this.api.setCutoff(this.api.user()!.id, meal, minutes).subscribe({
      next: (s) => { this.slots.set(s); this.api.toast(`${meal} cutoff set to ${minutes} min`); },
      error: (e) => this.api.toast(e.error?.message ?? 'Update failed'),
    });
  }
}
