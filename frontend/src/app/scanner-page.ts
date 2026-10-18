import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, TokenQr, VerifyResult } from './api';

@Component({
  selector: 'app-scanner',
  imports: [FormsModule],
  template: `
    <h2>Scanner</h2>
    <p>Paste a QR payload (Base64) or pick one of today's tokens. Optionally simulate the scan time.</p>
    <select (change)="payload = $any($event.target).value">
      <option value="">-- pick token --</option>
      @for (t of tokens(); track t.tokenId) {
        <option [value]="t.payload">{{ t.employeeId }} / {{ t.meal }} {{ t.issued ? '(used)' : '' }}</option>
      }
    </select>
    <textarea [(ngModel)]="payload" rows="4" placeholder="Base64 payload"></textarea>
    <label>Simulate time (HH:mm, optional) <input [(ngModel)]="at" placeholder="13:00" /></label>
    <button (click)="verify()">Verify and issue</button>
    @if (result(); as r) {
      <div class="result" [class.ok]="r.status === 'VALID'" [class.bad]="r.status !== 'VALID'">
        <strong>{{ r.status }}</strong> - {{ r.message }}
        @if (r.employee) { <div>{{ r.employee.name }} ({{ r.employee.department }})</div> }
      </div>
    }
  `,
})
export class ScannerPage {
  private api = inject(Api);
  protected payload = '';
  protected at = '';
  protected result = signal<VerifyResult | null>(null);
  protected tokens = signal<TokenQr[]>([]);

  constructor() { this.refresh(); }
  private refresh(): void { this.api.tokens().subscribe((t) => this.tokens.set(t)); }
  protected verify(): void {
    if (!this.payload.trim()) { this.result.set({ status: 'INVALID', message: 'Paste a QR payload or pick a token first.' }); return; }
    this.api.verify(this.payload, this.at.trim()).subscribe({
      next: (r) => { this.result.set(r); this.refresh(); },
      error: (e) => this.result.set({ status: 'ERROR', message: e.error?.message ?? 'Verification request failed' }),
    });
  }
}
