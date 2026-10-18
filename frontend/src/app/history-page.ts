import { Component, effect, inject, signal } from '@angular/core';
import { Api, HistoryRow } from './api';

@Component({
  selector: 'app-history',
  template: `
    <h2>Meal history for {{ api.user()?.name }}</h2>
    <table>
      <thead><tr><th>Date</th><th>Meal</th><th>Status</th><th>Issued at</th></tr></thead>
      <tbody>
        @for (r of rows(); track r.tokenId) {
          <tr><td>{{ r.date }}</td><td>{{ r.meal }}</td>
            <td [class]="r.status === 'issued' ? 'ok' : r.status === 'expired' ? 'bad' : ''">{{ r.status }}</td>
            <td>{{ r.issuedAt ?? '-' }}</td></tr>
        } @empty { <tr><td colspan="4">No tokens yet.</td></tr> }
      </tbody>
    </table>
  `,
})
export class HistoryPage {
  protected api = inject(Api);
  protected rows = signal<HistoryRow[]>([]);
  constructor() {
    effect(() => {
      const u = this.api.user();
      if (u) this.api.history(u.id).subscribe((r) => this.rows.set(r));
    });
  }
}
