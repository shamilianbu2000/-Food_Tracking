import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <h1>Corporate Food Tracking</h1>
      <nav>
        <a routerLink="/meals" routerLinkActive="on">My Meals</a>
        <a routerLink="/history" routerLinkActive="on">History</a>
        @if (api.user()?.role === 'admin') {
          <a routerLink="/scanner" routerLinkActive="on">Scanner</a>
          <a routerLink="/admin" routerLinkActive="on">Admin Report</a>
          <a routerLink="/dashboard" routerLinkActive="on">Dashboard</a>
          <a routerLink="/menu-planner" routerLinkActive="on">Menu Planner</a>
        }
      </nav>
      <label>Signed in as
        <select (change)="switch($any($event.target).value)">
          @for (e of api.employees(); track e.id) {
            <option [value]="e.id" [selected]="e.id === api.user()?.id">{{ e.name }} ({{ e.role }})</option>
          }
        </select>
      </label>
    </header>
    <div class="banner">
      <strong>Demo app, mock sign-in.</strong>
      Use <em>Signed in as</em> (top right) to switch between employees and Admin Frank.
      @if (api.user()?.role === 'admin') {
        You are an <b>admin</b>: run the daily job under Admin Report, verify QR tokens on Scanner, see Dashboard and edit the Menu Planner.
      } @else {
        You are an <b>employee</b>: get a QR token for each meal below, cancel it before the cutoff, and check History.
        Switch to <b>Admin Frank</b> to generate tokens for everyone and scan them.
      }
    </div>
    <main><router-outlet /></main>
    <div class="toasts">
      @for (t of api.toasts(); track t.id) { <div class="toast">{{ t.text }}</div> }
    </div>
  `,
})
export class App implements OnInit {
  protected api = inject(Api);
  private router = inject(Router);
  ngOnInit(): void { this.api.init(); }
  protected switch(id: string): void {
    this.api.switchUser(id);
    if (this.api.user()?.role !== 'admin' && /^\/(scanner|admin|dashboard|menu-planner)/.test(this.router.url)) this.router.navigateByUrl('/meals');
  }
}
