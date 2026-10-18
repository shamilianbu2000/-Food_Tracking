import { Component, inject, signal } from '@angular/core';
import { API, Api, ReportRow } from './api';

@Component({
  selector: 'app-admin',
  template: `
    <h2>Admin Report</h2>
    <div class="actions">
      <button (click)="run()">Run daily job now</button>
      <a class="btn" [href]="base + '/reports/qr.pdf'" target="_blank">Download QR PDF</a>
      <a class="btn" [href]="base + '/reports/tokens.xlsx'" target="_blank">Export Excel</a>
      <button (click)="load()">Refresh</button>
    </div>
    <table>
      <thead><tr><th>Employee</th><th>Dept</th><th>Meal</th><th>Date</th><th>Status</th><th>Issued at</th></tr></thead>
      <tbody>
        @for (r of rows(); track r.tokenId) {
          <tr><td>{{ r.employee }}</td><td>{{ r.department }}</td><td>{{ r.meal }}</td><td>{{ r.date }}</td>
            <td [class]="r.issued ? 'ok' : ''">{{ r.issued ? 'Issued' : 'Pending' }}</td><td>{{ r.issuedAt ?? '-' }}</td></tr>
        } @empty { <tr><td colspan="6">No tokens yet - run the daily job.</td></tr> }
      </tbody>
    </table>
  `,
})
export class AdminPage {
  private api = inject(Api);
  protected base = API;
  protected rows = signal<ReportRow[]>([]);
  constructor() { this.load(); }
  protected load(): void { this.api.report().subscribe((r) => this.rows.set(r)); }
  protected run(): void {
    this.api.runDaily().subscribe((r) => { this.api.toast(`Daily job: ${r.generated} new tokens (${r.total} total)`); this.load(); });
  }
}
