import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <h1>Corporate Food Tracking</h1>
      <nav>
        <a routerLink="/meals" routerLinkActive="on">My Meals</a>
        @if (api.user()?.role === 'admin') {
          <a routerLink="/scanner" routerLinkActive="on">Scanner</a>
          <a routerLink="/admin" routerLinkActive="on">Admin Report</a>
        }
      </nav>
      <label>Signed in as
        <select (change)="api.switchUser($any($event.target).value)">
          @for (e of api.employees(); track e.id) {
            <option [value]="e.id">{{ e.name }} ({{ e.role }})</option>
          }
        </select>
      </label>
    </header>
    <main><router-outlet /></main>
    <div class="toasts">
      @for (t of api.toasts(); track t.id) { <div class="toast">{{ t.text }}</div> }
    </div>
  `,
})
export class App implements OnInit {
  protected api = inject(Api);
  ngOnInit(): void { this.api.init(); }
}
